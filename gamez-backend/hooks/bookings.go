package hooks

import (
	"fmt"
	"strings"
	"net/mail"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/mailer"
	"gamez-backend/logger"
)

func RegisterBookingHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Booking hooks registered")

	app.OnRecordAfterCreateSuccess("bookings").BindFunc(func(e *core.RecordEvent) error {
		email := e.Record.GetString("email")
		if email == "" {
			// No email to send to
			return e.Next()
		}

		// Gather details
		ref := e.Record.GetString("booking_reference")
		stationType := e.Record.GetString("station_type")
		startTime := e.Record.GetString("start_time")
		price := e.Record.GetFloat("total_price")

		// Create HTML body
		htmlBody := fmt.Sprintf(`
		<div style="background-color: #0d0b14; color: #fff; font-family: monospace; padding: 20px; border: 2px solid #06b6d4;">
			<h1 style="color: #06b6d4;">GAMEZ - BOOKING CONFIRMED</h1>
			<p>Your slot has been secured. Show this reference at the front desk:</p>
			<div style="background: #1a1625; padding: 15px; margin: 20px 0; border-left: 4px solid #a855f7;">
				<strong>REF:</strong> %s<br/>
				<strong>STATION:</strong> %s<br/>
				<strong>TIME:</strong> %s<br/>
				<strong>AMOUNT:</strong> ₹%.2f<br/>
			</div>
			<p>Get ready to play!</p>
		</div>`, ref, stationType, startTime, price)

		// Create message
		message := &mailer.Message{
			From: mail.Address{
				Address: app.Settings().Meta.SenderAddress,
				Name:    app.Settings().Meta.SenderName,
			},
			To: []mail.Address{
				{Address: email},
			},
			Subject: fmt.Sprintf("GameZ Booking Confirmed: %s", ref),
			HTML:    htmlBody,
			Text:    strings.ReplaceAll(htmlBody, "<br/>", "\n"),
		}

		// Send email
		if err := app.NewMailClient().Send(message); err != nil {
			logger.Error("HOOKS", fmt.Sprintf("Failed to send booking email to %s: %v", email, err))
		} else {
			logger.Info("HOOKS", fmt.Sprintf("Booking email sent to %s", email))
		}

		return e.Next()
	})
}
