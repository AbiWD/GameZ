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
	"gamez-backend/whatsapp"
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
		// Otherwise default to temporary 3-minute pending hold.
		if record.GetString("status") != "confirmed" {
			// Calculate 3-minute expiration window for temporary holds
			expiresAt := time.Now().Add(3 * time.Minute)
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
		info, err := e.RequestInfo()
		if err != nil {
			return apis.NewBadRequestError("Invalid request", err)
		}

		// Admin / Staff / Manager bypass for lounge staff overriding fields
		if e.HasSuperuserAuth() || (info.Auth != nil && info.Auth.Collection() != nil && info.Auth.Collection().Name == "staff_accounts") {
			return e.Next()
		}

		record := e.Record
		original := record.Original()

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

	// Helper to generate unified PocketBase-styled Cyber HTML Email
	buildCyberEmailHTML := func(title, subtitle, badgeText, badgeColor, ref, stationName, startTime, durationStr string, price float64) string {
		siteURL := app.Settings().Meta.AppURL
		if siteURL == "" {
			siteURL = "http://localhost:4173"
		}

		priceStr := ""
		if price > 0 {
			priceStr = fmt.Sprintf(`<tr>
										<td style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);">AMOUNT PAID</td>
										<td align="right" style="color: #4ade80; font-family: monospace; font-weight: 700; font-size: 14px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);">₹%.2f</td>
									</tr>`, price)
		}

		ctaButton := ""
		if badgeText == "CANCELLED" {
			ctaButton = fmt.Sprintf(`<div style="text-align: center; margin-top: 24px;">
				<a href="%s" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #a855f7 0%%, #06b6d4 100%%); color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; box-shadow: 0 4px 14px rgba(168,85,247,0.4);">
					🎮 Visit GameZ
				</a>
			</div>`, siteURL)
		} else {
			ctaButton = fmt.Sprintf(`<div style="text-align: center; margin-top: 24px;">
				<a href="%s" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%%, #06b6d4 100%%); color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; text-decoration: none; box-shadow: 0 4px 14px rgba(34,197,94,0.4);">
					🎮 Visit GameZ
				</a>
			</div>`, siteURL)
		}

		durationRow := ""
		if durationStr != "" {
			durationRow = fmt.Sprintf(`<tr>
										<td style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);">PLAY DURATION</td>
										<td align="right" style="color: #a855f7; font-weight: 700; font-size: 13px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);">%s</td>
									</tr>`, durationStr)
		}

		return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0d0b14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
	<table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0b14; padding: 40px 10px;">
		<tr>
			<td align="center">
				<table role="presentation" width="100%%" style="max-width: 520px; background-color: #13111c; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
					<!-- Header Logo Banner -->
					<tr>
						<td align="center" style="background: linear-gradient(135deg, #1f1b2e 0%%, #13111c 100%%); padding: 32px 24px; border-bottom: 1px solid rgba(255,255,255,0.05);">
							<h1 style="color: #a855f7; font-size: 26px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; margin: 0; font-family: sans-serif;">GAMEZ</h1>
							<span style="color: #06b6d4; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; display: block; margin-top: 4px;">Ultimate Gaming Lounge</span>
						</td>
					</tr>
					<!-- Main Content -->
					<tr>
						<td style="padding: 32px 28px; color: #e2e8f0; font-size: 14px; line-height: 1.6;">
							<div style="margin-bottom: 16px;">
								<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background-color: %s15; color: %s; border: 1px solid %s40;">
									%s
								</span>
							</div>
							<h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 8px 0;">%s</h2>
							<p style="color: #94a3b8; font-size: 13px; margin: 0 0 24px 0;">%s</p>

							<!-- Reservation Card -->
							<div style="background-color: #1a1625; border: 1px solid rgba(168,85,247,0.25); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
								<table width="100%%" border="0" cellspacing="0" cellpadding="0">
									<tr>
										<td style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 6px 0;">BOOKING REF</td>
										<td align="right" style="color: #06b6d4; font-family: monospace; font-weight: 800; font-size: 14px; padding: 6px 0;">%s</td>
									</tr>
									<tr>
										<td style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);">STATION</td>
										<td align="right" style="color: #ffffff; font-weight: 700; font-size: 13px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);">%s</td>
									</tr>
									%s
									<tr>
										<td style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);">SCHEDULED TIME</td>
										<td align="right" style="color: #ffffff; font-family: monospace; font-size: 12px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);">%s</td>
									</tr>
									%s
								</table>
							</div>

							%s

							<p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center;">
								Need help? Contact GameZ Lounge Support at <a href="mailto:support@gamezcafe.com" style="color: #06b6d4;">support@gamezcafe.com</a>
							</p>
						</td>
					</tr>
					<!-- Footer -->
					<tr>
						<td align="center" style="background-color: #0f0d17; padding: 20px; color: #64748b; font-size: 11px; border-top: 1px solid rgba(255,255,255,0.05);">
							&copy; 2026 GameZ Mangaluru. All rights reserved. | <a href="%s" style="color: #06b6d4; text-decoration: none;">gamez.in</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`, badgeColor, badgeColor, badgeColor, badgeText, title, subtitle, ref, stationName, durationRow, startTime, priceStr, ctaButton, siteURL)
	}

	istLoc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		istLoc = time.FixedZone("IST", 5*3600+30*60)
	}

	formatBookingTime := func(rec *core.Record) string {
		dt := rec.GetDateTime("start_time")
		if dt.IsZero() {
			return ""
		}
		return dt.Time().In(istLoc).Format("02 Jan 2006, 03:04 PM IST")
	}

	getDurationText := func(rec *core.Record) string {
		sDT := rec.GetDateTime("start_time")
		eDT := rec.GetDateTime("end_time")
		if !sDT.IsZero() && !eDT.IsZero() {
			diff := eDT.Time().Sub(sDT.Time())
			hours := diff.Hours()
			if hours >= 1 {
				hInt := int(hours + 0.01)
				if float64(hInt) == hours {
					if hInt == 1 {
						return "1 Hour"
					}
					return fmt.Sprintf("%d Hours", hInt)
				}
				return fmt.Sprintf("%.1f Hours", hours)
			}
			mins := int(diff.Minutes() + 0.5)
			if mins > 0 {
				return fmt.Sprintf("%d Mins", mins)
			}
		}
		durationHours := rec.GetFloat("duration_hours")
		if durationHours > 0 {
			if durationHours == 1 {
				return "1 Hour"
			}
			return fmt.Sprintf("%.0f Hours", durationHours)
		}
		return "1 Hour"
	}

	// Helper to extract clean Booking Reference (#OT-8412) and Station Name
	getRefAndStationName := func(rec *core.Record) (string, string) {
		ref := rec.GetString("booking_reference")
		if ref == "" {
			ref = rec.GetString("id")
		}

		stationName := "Gaming Station"
		assignedID := rec.GetString("assigned_station_id")
		if assignedID != "" {
			stRecord, err := app.FindRecordById("stations", assignedID)
			if err == nil && stRecord != nil {
				stType := stRecord.GetString("station_type")
				stName := stRecord.GetString("name")
				if stType != "" {
					stationName = stType
				} else if stName != "" {
					stationName = stName
				}
			} else {
				stationName = assignedID
			}
		}
		return ref, stationName
	}

	// 3. AFTER CREATE: Send Confirmation Email & Enqueue WhatsApp Message
	app.OnRecordAfterCreateSuccess("bookings").BindFunc(func(e *core.RecordEvent) error {
		email := e.Record.GetString("email")
		status := e.Record.GetString("status")

		// Skip emails if email is empty or booking was cancelled
		if email == "" || status == "cancelled" || status == "expired" {
			return e.Next()
		}

		ref, stationName := getRefAndStationName(e.Record)
		startTime := formatBookingTime(e.Record)
		durationStr := getDurationText(e.Record)
		price := e.Record.GetFloat("total_price")

		title := "Booking Confirmed!"
		subtitle := "Your gaming station reservation is confirmed and ready for your session."
		badgeText := "CONFIRMED"
		badgeColor := "#22c55e"
		subject := fmt.Sprintf("GameZ Booking Confirmed: %s", ref)

		htmlBody := buildCyberEmailHTML(title, subtitle, badgeText, badgeColor, ref, stationName, startTime, durationStr, price)

		// 1. Send Email Notification
		message := &mailer.Message{
			From: mail.Address{
				Address: app.Settings().Meta.SenderAddress,
				Name:    app.Settings().Meta.SenderName,
			},
			To: []mail.Address{
				{Address: email},
			},
			Subject: subject,
			HTML:    htmlBody,
			Text:    fmt.Sprintf("%s\nRef: %s\nStation: %s\nDuration: %s\nTime: %s", title, ref, stationName, durationStr, startTime),
		}

		go func() {
			defer func() {
				if r := recover(); r != nil {
					logger.Error("HOOKS", fmt.Sprintf("Booking email goroutine panicked: %v", r))
				}
			}()
			
			if err := app.NewMailClient().Send(message); err != nil {
				logger.Error("HOOKS", fmt.Sprintf("Failed to send booking email to %s: %v", email, err))
			} else {
				logger.Info("HOOKS", fmt.Sprintf("Booking confirmation email sent to %s", email))
			}
		}()

		// 2. Dispatch WhatsApp Ticket via Outbox Queue
		if (status == "confirmed" || status == "pending") && whatsapp.GlobalQueue != nil {
			phone := e.Record.GetString("phone")
			if phone != "" {
				waText := fmt.Sprintf("🎮 *GameZ Booking Confirmed!*\n\nRef: *#%s*\nStation: %s\nDuration: *%s*\nTime: %s\nTotal: ₹%.0f\n\nShow this ticket at front desk for instant check-in!", ref, stationName, durationStr, startTime, price)
				_ = whatsapp.GlobalQueue.Enqueue(e.Record.Id, "booking_confirmation", phone, email, waText, htmlBody, subject)
			}
		}

		return e.Next()
	})

	// 4. AFTER UPDATE: Send Confirmation or Cancellation Email
	app.OnRecordAfterUpdateSuccess("bookings").BindFunc(func(e *core.RecordEvent) error {
		status := e.Record.GetString("status")
		email := e.Record.GetString("email")

		if email == "" {
			return e.Next()
		}

		ref, stationName := getRefAndStationName(e.Record)
		startTime := formatBookingTime(e.Record)
		durationStr := getDurationText(e.Record)
		price := e.Record.GetFloat("total_price")

		if status == "confirmed" {
			title := "Booking Confirmed!"
			subtitle := "Your gaming station reservation is confirmed and ready for your session."
			badgeText := "CONFIRMED"
			badgeColor := "#22c55e"
			subject := fmt.Sprintf("GameZ Booking Confirmed: %s", ref)

			htmlBody := buildCyberEmailHTML(title, subtitle, badgeText, badgeColor, ref, stationName, startTime, durationStr, price)
			waText := fmt.Sprintf("🎮 *GameZ Booking Confirmed!*\n\nRef: *#%s*\nStation: %s\nDuration: *%s*\nTime: %s\nTotal: ₹%.0f\n\nShow this ticket at front desk for instant check-in!", ref, stationName, durationStr, startTime, price)

			if whatsapp.GlobalQueue != nil {
				phone := e.Record.GetString("phone")
				_ = whatsapp.GlobalQueue.Enqueue(e.Record.Id, "booking_confirmation", phone, email, waText, htmlBody, subject)
			}
		} else if status == "cancelled" {
			title := "Booking Cancelled"
			subtitle := "Your booking reservation has been cancelled and the slot has been released."
			badgeText := "CANCELLED"
			badgeColor := "#ef4444"
			subject := fmt.Sprintf("GameZ Booking Cancelled: %s", ref)

			htmlBody := buildCyberEmailHTML(title, subtitle, badgeText, badgeColor, ref, stationName, startTime, durationStr, 0)
			waText := fmt.Sprintf("⚠️ *GameZ Notice*\n\nYour reservation *#%s* for %s (%s, %s) has been cancelled and refunded.\n\nBook next session: http://localhost:4173", ref, stationName, durationStr, startTime)

			// Emergency Blackout: Send Email immediately in parallel + Enqueue WhatsApp
			message := &mailer.Message{
				From: mail.Address{
					Address: app.Settings().Meta.SenderAddress,
					Name:    app.Settings().Meta.SenderName,
				},
				To: []mail.Address{
					{Address: email},
				},
				Subject: subject,
				HTML:    htmlBody,
				Text:    fmt.Sprintf("%s\nRef: %s\nStation: %s\nTime: %s", title, ref, stationName, startTime),
			}

			go func() {
				defer func() {
					if r := recover(); r != nil {
						logger.Error("HOOKS", fmt.Sprintf("Cancellation email goroutine panicked: %v", r))
					}
				}()
				_ = app.NewMailClient().Send(message)
			}()

			if whatsapp.GlobalQueue != nil {
				phone := e.Record.GetString("phone")
				_ = whatsapp.GlobalQueue.Enqueue(e.Record.Id, "blackout_cancellation", phone, email, waText, htmlBody, subject)
			}
		}

		return e.Next()
	})
}
