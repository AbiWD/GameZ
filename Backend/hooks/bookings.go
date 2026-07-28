package hooks

import (
	"fmt"
	"strings"
	"time"
	"net/mail"
	"sync"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/mailer"
	"github.com/pocketbase/pocketbase/tools/security"
	"github.com/pocketbase/pocketbase/tools/types"
	"github.com/pocketbase/pocketbase/apis"
	"gamez-backend/logger"
)

func RegisterBookingHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Booking hooks registered")

	// Use a Go mutex to guarantee TOCTOU safety since SQLite is single-writer anyway.
	// NOTE: SAFE ONLY FOR SINGLE-INSTANCE DEPLOYMENT. This serializes the overlap check
	// and the DB insert, preventing any race conditions within this single Go process.
	var bookingLock sync.Mutex

	// 1. BEFORE CREATE: Server-side logic & Pricing
	app.OnRecordCreateRequest("bookings").BindFunc(func(e *core.RecordRequestEvent) error {
		// Admin bypass for staff logging walk-ins or comping bookings
		if e.HasSuperuserAuth() {
			return e.Next()
		}

		// Acquire the lock to prevent concurrent overlapping bookings
		bookingLock.Lock()
		defer bookingLock.Unlock()

		record := e.Record
		stationId := record.GetString("assigned_station_id")
		var rate float64

		if stationId != "" {
			// 1.5 ATOMIC OVERLAP VALIDATION
			startStr := record.GetDateTime("start_time").String()
			endStr := record.GetDateTime("end_time").String()

			overlapCount, err := e.App.CountRecords(
				"bookings",
				dbx.NewExp(
					"assigned_station_id = {:station} AND (status = 'pending' OR status = 'confirmed') AND start_time < {:end} AND end_time > {:start}",
					dbx.Params{
						"station": stationId,
						"start":   startStr,
						"end":     endStr,
					},
				),
			)

			if err != nil {
				return apis.NewBadRequestError("Failed to validate booking overlap", err)
			}
			if overlapCount > 0 {
				return apis.NewBadRequestError("This station is already booked during the requested time.", nil)
			}

			// Ensure the requested station is not under maintenance
			station, err := e.App.FindRecordById("stations", stationId)
			if err != nil {
				return apis.NewBadRequestError("Invalid station", err)
			}
			if station.GetString("status") == "maintenance" {
				return apis.NewBadRequestError("Station is currently under maintenance", nil)
			}
			rate = station.GetFloat("price_per_hour")
			if rate == 0 {
				rate = station.GetFloat("rate_per_hour")
			}
		}

		if rate == 0 {
			stName := record.GetString("station_type")
			if stName != "" {
				stType, err := e.App.FindFirstRecordByFilter("station_types", "name = {:name}", dbx.Params{"name": stName})
				if err == nil {
					rate = stType.GetFloat("base_price")
				}
			}
		}

		// Calculate total price purely on the server
		startTime := record.GetDateTime("start_time").Time()
		endTime := record.GetDateTime("end_time").Time()
		durationHours := endTime.Sub(startTime).Hours()
		if durationHours <= 0 {
			durationHours = 1
		}
		totalPrice := rate * durationHours
		if totalPrice <= 0 {
			totalPrice = record.GetFloat("total_price")
		}
		if totalPrice <= 0 {
			totalPrice = 100
		}
		record.Set("total_price", totalPrice)

		// If client specified status as "confirmed" (e.g. registered customer / confirmed booking), keep confirmed.
		// Otherwise default to temporary 5-minute pending hold.
		if record.GetString("status") != "confirmed" {
			record.Set("status", "pending")
			
			expiresAt := time.Now().Add(5 * time.Minute)
			dt, _ := types.ParseDateTime(expiresAt)
			record.Set("expires_at", dt)
		}

		// Always generate secure hold_token for update/cancellation identification
		if record.GetString("hold_token") == "" {
			token := security.RandomString(32)
			record.Set("hold_token", token)
		}

		// Execute the save natively. The Go mutex prevents TOCTOU race conditions.
		nextErr := e.Next()
		if nextErr != nil && strings.Contains(nextErr.Error(), "UNIQUE constraint failed") {
			return apis.NewBadRequestError("This slot is no longer available. Someone else just booked it!", nil)
		}
		return nextErr
	})

	// 2. BEFORE UPDATE: Field Whitelist & Auth Check
	app.OnRecordUpdateRequest("bookings").BindFunc(func(e *core.RecordRequestEvent) error {
		// Admin bypass for staff overriding fields
		if e.HasSuperuserAuth() {
			return e.Next()
		}

		record := e.Record
		original := record.Original()

		info, err := e.RequestInfo()
		if err != nil {
			return apis.NewBadRequestError("Invalid request", err)
		}

		// Authenticated Customer or Hold Token Verification
		isOwner := false
		if info.Auth != nil {
			// Check if authenticated user owns the booking by customer_id or email
			if info.Auth.Id == original.GetString("customer_id") || (info.Auth.Email() != "" && strings.EqualFold(info.Auth.Email(), original.GetString("email"))) {
				isOwner = true
			}
		}

		// If not owner by auth, check hold_token
		if !isOwner {
			providedToken, hasToken := info.Body["hold_token"]
			if hasToken && fmt.Sprintf("%v", providedToken) == original.GetString("hold_token") {
				isOwner = true
			}
		}

		if !isOwner {
			return apis.NewForbiddenError("Invalid or missing hold_token to update this booking", nil)
		}

		// Block updates if the booking is in a terminal state (cancelled or completed)
		currentStatus := original.GetString("status")
		if currentStatus == "cancelled" || currentStatus == "completed" {
			return apis.NewBadRequestError(fmt.Sprintf("Cannot modify a booking that is %s", currentStatus), nil)
		}

		// If booking was expired, but owner is extending or updating it, automatically re-activate as confirmed
		if currentStatus == "expired" {
			newStatus, hasStatus := info.Body["status"]
			if !hasStatus || fmt.Sprintf("%v", newStatus) != "cancelled" {
				record.Set("status", "confirmed")
			}
		}

		// Prevent token rotation by the client
		record.Set("hold_token", original.GetString("hold_token"))

		// Allowed fields for customer modification (extend hours, cancellation, contact info update)
		allowedFields := map[string]bool{
			"name": true, "phone": true, "players": true, "email": true, "hold_token": true,
			"status": true, "end_time": true, "total_price": true,
		}

		// Check what the client actually sent in the JSON payload
		for key := range info.Body {
			if !allowedFields[key] {
				return apis.NewBadRequestError(fmt.Sprintf("You are not allowed to update the field: %s", key), nil)
			}
		}

		return e.Next()
	})

	// 3. AFTER CREATE: Send Email
	app.OnRecordAfterCreateSuccess("bookings").BindFunc(func(e *core.RecordEvent) error {
		email := e.Record.GetString("email")
		if email == "" {
			return e.Next()
		}

		ref := e.Record.GetString("id")
		stationType := e.Record.GetString("assigned_station_id")
		startTime := e.Record.GetDateTime("start_time").Time().Format("2006-01-02 15:04")
		price := e.Record.GetFloat("total_price")

		htmlBody := fmt.Sprintf(`
		<div style="background-color: #0d0b14; color: #fff; font-family: monospace; padding: 20px; border: 2px solid #eab308;">
			<h1 style="color: #eab308;">GAMEZ - BOOKING HELD</h1>
			<p>Your slot is temporarily held for 5 minutes. Please proceed to the front desk to complete payment and confirm your booking. If unconfirmed, this hold will expire.</p>
			<div style="background: #1a1625; padding: 15px; margin: 20px 0; border-left: 4px solid #a855f7;">
				<strong>REF:</strong> %s<br/>
				<strong>STATION ID:</strong> %s<br/>
				<strong>TIME:</strong> %s<br/>
				<strong>AMOUNT:</strong> ₹%.2f<br/>
			</div>
			<p>Get ready to play!</p>
		</div>`, ref, stationType, startTime, price)

		message := &mailer.Message{
			From: mail.Address{
				Address: app.Settings().Meta.SenderAddress,
				Name:    app.Settings().Meta.SenderName,
			},
			To: []mail.Address{
				{Address: email},
			},
			Subject: fmt.Sprintf("GameZ Booking Hold Created: %s", ref),
			HTML:    htmlBody,
			Text:    strings.ReplaceAll(htmlBody, "<br/>", "\n"),
		}

		// Send email asynchronously in a goroutine so it doesn't block the global bookingLock mutex
		go func() {
			defer func() {
				if r := recover(); r != nil {
					logger.Error("HOOKS", fmt.Sprintf("Booking email goroutine panicked: %v", r))
				}
			}()
			
			if err := app.NewMailClient().Send(message); err != nil {
				logger.Error("HOOKS", fmt.Sprintf("Failed to send booking email to %s: %v", email, err))
			} else {
				logger.Info("HOOKS", fmt.Sprintf("Booking email sent to %s", email))
			}
		}()

		return e.Next()
	})

	// 4. AFTER UPDATE: Send Cancellation Email
	app.OnRecordAfterUpdateSuccess("bookings").BindFunc(func(e *core.RecordEvent) error {
		status := e.Record.GetString("status")
		email := e.Record.GetString("email")

		// Only send email if the booking was changed to cancelled and customer email is present
		if status != "cancelled" || email == "" {
			return e.Next()
		}

		ref := e.Record.GetString("id")
		startTime := e.Record.GetDateTime("start_time").Time().Format("2006-01-02 15:04")

		htmlBody := fmt.Sprintf(`
		<div style="background-color: #0d0b14; color: #fff; font-family: monospace; padding: 20px; border: 2px solid #ef4444;">
			<h1 style="color: #ef4444;">GAMEZ - BOOKING CANCELLED</h1>
			<p>Your booking reservation has been cancelled.</p>
			<div style="background: #1a1625; padding: 15px; margin: 20px 0; border-left: 4px solid #ef4444;">
				<strong>BOOKING REF:</strong> %s<br/>
				<strong>SCHEDULED TIME:</strong> %s<br/>
				<strong>STATUS:</strong> CANCELLED<br/>
			</div>
			<p>If you have any questions or require assistance, please contact cafe management.</p>
		</div>`, ref, startTime)

		message := &mailer.Message{
			From: mail.Address{
				Address: app.Settings().Meta.SenderAddress,
				Name:    app.Settings().Meta.SenderName,
			},
			To: []mail.Address{
				{Address: email},
			},
			Subject: fmt.Sprintf("GameZ Booking Cancelled: %s", ref),
			HTML:    htmlBody,
			Text:    strings.ReplaceAll(htmlBody, "<br/>", "\n"),
		}

		go func() {
			defer func() {
				if r := recover(); r != nil {
					logger.Error("HOOKS", fmt.Sprintf("Cancellation email goroutine panicked: %v", r))
				}
			}()
			
			if err := app.NewMailClient().Send(message); err != nil {
				logger.Error("HOOKS", fmt.Sprintf("Failed to send cancellation email to %s: %v", email, err))
			} else {
				logger.Info("HOOKS", fmt.Sprintf("Cancellation email sent to %s", email))
			}
		}()

		return e.Next()
	})
}
