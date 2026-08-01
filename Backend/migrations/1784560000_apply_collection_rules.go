package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		collections := []string{"stations", "bookings", "portal_users", "staff_accounts", "blackout_periods", "station_types", "tier_prices"}
		for _, name := range collections {
			col, err := app.FindCollectionByNameOrId(name)
			if err == nil && col != nil {
				col.ListRule = types.Pointer("")
				col.ViewRule = types.Pointer("")
				col.CreateRule = types.Pointer("")
				col.UpdateRule = types.Pointer("")
				col.DeleteRule = types.Pointer("")
				_ = app.Save(col)
			}
		}
		return nil
	}, func(app core.App) error {
		// Rollback Stations
		stations, err := app.FindCollectionByNameOrId("stations")
		if err == nil {
			stations.ListRule = nil
			stations.ViewRule = nil
			app.Save(stations)
		}

		// Rollback Bookings
		bookings, err := app.FindCollectionByNameOrId("bookings")
		if err == nil {
			bookings.ListRule = nil
			bookings.ViewRule = nil
			bookings.CreateRule = nil
			bookings.UpdateRule = nil
			
			var newIndexes []string
			for _, idx := range bookings.Indexes {
				if idx != "CREATE UNIQUE INDEX idx_booking_slot ON bookings (assigned_station_id, start_time)" {
					newIndexes = append(newIndexes, idx)
				}
			}
			bookings.Indexes = newIndexes
			app.Save(bookings)
		}
		return nil
	})
}
