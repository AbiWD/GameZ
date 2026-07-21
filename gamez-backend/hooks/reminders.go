package hooks

import (
	"fmt"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/cron"
	"gamez-backend/logger"
)

func RegisterReminderScheduler(app *pocketbase.PocketBase) {
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		scheduler := cron.New()

		// Run every minute to sweep expired bookings
		scheduler.MustAdd("sweep_expired_bookings", "* * * * *", func() {
			nowStr := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
			
			// Find all bookings where status is 'pending' and expires_at < now
			records, err := app.FindRecordsByFilter(
				"bookings", 
				"status = 'pending' && expires_at < {:now}",
				"", // No sort
				0, // No limit
				0, // No offset
				dbx.Params{"now": nowStr},
			)

			if err != nil {
				logger.Error("CRON", fmt.Sprintf("Failed to fetch expired bookings: %v", err))
				return
			}

			if len(records) > 0 {
				logger.Info("CRON", fmt.Sprintf("Sweeping %d expired bookings", len(records)))
				for _, record := range records {
					record.Set("status", "expired")
					if saveErr := app.SaveNoValidate(record); saveErr != nil {
						logger.Error("CRON", fmt.Sprintf("Failed to expire booking %s: %v", record.Id, saveErr))
					} else {
						logger.Info("CRON", fmt.Sprintf("Booking %s marked as expired (lock released)", record.Id))
					}
				}
			}
		})

		scheduler.Start()

		return e.Next()
	})
}
