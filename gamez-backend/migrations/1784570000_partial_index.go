package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		bookings, err := app.FindCollectionByNameOrId("bookings")
		if err != nil {
			return err
		}

		// Remove the old unconditional index
		var newIndexes []string
		for _, idx := range bookings.Indexes {
			if idx != "CREATE UNIQUE INDEX idx_booking_slot ON bookings (assigned_station_id, start_time)" {
				newIndexes = append(newIndexes, idx)
			}
		}
		bookings.Indexes = newIndexes

		// Add the partial index natively to the collection schema
		bookings.Indexes = append(bookings.Indexes, "CREATE UNIQUE INDEX `idx_booking_slot_partial` ON `bookings` (`assigned_station_id`, `start_time`) WHERE `status`='pending' OR `status`='confirmed'")

		return app.Save(bookings)
	}, func(app core.App) error {
		bookings, err := app.FindCollectionByNameOrId("bookings")
		if err == nil {
			// Rollback to unconditional index
			var newIndexes []string
			for _, idx := range bookings.Indexes {
				if idx != "CREATE UNIQUE INDEX `idx_booking_slot_partial` ON `bookings` (`assigned_station_id`, `start_time`) WHERE `status`='pending' OR `status`='confirmed'" {
					newIndexes = append(newIndexes, idx)
				}
			}
			bookings.Indexes = newIndexes
			bookings.Indexes = append(bookings.Indexes, "CREATE UNIQUE INDEX idx_booking_slot ON bookings (assigned_station_id, start_time)")
			app.Save(bookings)
		}
		return nil
	})
}
