package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		// Update Stations Rules
		stations, err := app.FindCollectionByNameOrId("stations")
		if err != nil {
			return err
		}
		stations.ListRule = types.Pointer("")
		stations.ViewRule = types.Pointer("")
		if err := app.Save(stations); err != nil {
			return err
		}

		// Update Bookings Rules & Indexes
		bookings, err := app.FindCollectionByNameOrId("bookings")
		if err != nil {
			return err
		}
		bookings.ListRule = types.Pointer("")
		bookings.ViewRule = types.Pointer("")
		bookings.CreateRule = types.Pointer("")
		bookings.UpdateRule = types.Pointer("")
		
		bookings.Indexes = []string{}
		

		
		if err := app.Save(bookings); err != nil {
			return err
		}

		// Update portal_users Rules
		portalUsers, err := app.FindCollectionByNameOrId("portal_users")
		if err == nil && portalUsers != nil {
			portalUsers.ListRule = types.Pointer("")
			portalUsers.ViewRule = types.Pointer("")
			portalUsers.CreateRule = types.Pointer("")
			portalUsers.UpdateRule = types.Pointer("")
			if err := app.Save(portalUsers); err != nil {
				return err
			}
		}

		// Update staff_accounts Rules
		staffAccounts, err := app.FindCollectionByNameOrId("staff_accounts")
		if err == nil && staffAccounts != nil {
			staffAccounts.ListRule = types.Pointer("")
			staffAccounts.ViewRule = types.Pointer("")
			staffAccounts.CreateRule = types.Pointer("")
			staffAccounts.UpdateRule = types.Pointer("")
			staffAccounts.DeleteRule = types.Pointer("")
			if err := app.Save(staffAccounts); err != nil {
				return err
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
