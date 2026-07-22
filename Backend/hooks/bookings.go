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

		// Ensure the requested station is actually available
		station, err := e.App.FindRecordById("stations", stationId)
		if err != nil {
			return apis.NewBadRequestError("Invalid station", err)
		}
		if station.GetString("status") != "available" {
			return apis.NewBadRequestError("Station is not available for booking", nil)
		}

		// Calculate total price purely on the server
		rate := station.GetFloat("rate_per_hour")
		startTime := record.GetDateTime("start_time").Time()
		endTime := record.GetDateTime("end_time").Time()
		durationHours := endTime.Sub(startTime).Hours()
		if durationHours <= 0 {
			return apis.NewBadRequestError("Invalid booking duration", nil)
		}
		totalPrice := rate * durationHours
		record.Set("total_price", totalPrice)

		// Force the status to pending
		record.Set("status", "pending")

		// Securely generate the hold token and expiry
		token := security.RandomString(32)
		record.Set("hold_token", token)
		
		expiresAt := time.Now().Add(5 * time.Minute)
		dt, _ := types.ParseDateTime(expiresAt)
		record.Set("expires_at", dt)

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

		// Verify the user actually possesses the hold_token for this booking
		info, err := e.RequestInfo()
		if err != nil {
			return apis.NewBadRequestError("Invalid request", err)
		}
		
		providedToken, hasToken := info.Body["hold_token"]
		if !hasToken || providedToken != original.GetString("hold_token") {
			return apis.NewForbiddenError("Invalid or missing hold_token to update this booking", nil)
		}

		// Block updates if the booking is in a terminal state
		currentStatus := original.GetString("status")
		if currentStatus == "confirmed" || currentStatus == "expired" || currentStatus == "cancelled" || currentStatus == "completed" {
			return apis.NewBadRequestError(fmt.Sprintf("Cannot modify a booking that is %s", currentStatus), nil)
		}

		// Prevent token rotation by the client
		record.Set("hold_token", original.GetString("hold_token"))

		// Field Whitelisting!
		// We only allow name, phone, email, and players to be modified.
		// If the client tried to tamper with anything else, we reject the update entirely.
		allowedFields := map[string]bool{
			"name": true, "phone": true, "players": true, "email": true, "hold_token": true,
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
}
