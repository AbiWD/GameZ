package hooks

import (
	"fmt"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/tools/security"
	"gamez-backend/logger"
)

func RegisterStationHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Station hooks registered")

	// Ensure API access rules for admin collections and fix blackout_periods schema
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		// Ensure physical SQLite columns exist for blackout_periods
		_, _ = app.DB().NewQuery("ALTER TABLE blackout_periods ADD COLUMN start_time TEXT DEFAULT ''").Execute()
		_, _ = app.DB().NewQuery("ALTER TABLE blackout_periods ADD COLUMN end_time TEXT DEFAULT ''").Execute()
		_, _ = app.DB().NewQuery("ALTER TABLE blackout_periods ADD COLUMN property_id TEXT DEFAULT ''").Execute()
		_, _ = app.DB().NewQuery("ALTER TABLE blackout_periods ADD COLUMN reason TEXT DEFAULT ''").Execute()

		// Ensure fields exist in blackout_periods collection schema
		if blackoutCol, err := app.FindCollectionByNameOrId("blackout_periods"); err == nil && blackoutCol != nil {
			changed := false
			if blackoutCol.Fields.GetByName("reason") == nil {
				blackoutCol.Fields.Add(&core.TextField{Name: "reason"})
				changed = true
			}
			if blackoutCol.Fields.GetByName("start_time") == nil {
				blackoutCol.Fields.Add(&core.DateField{Name: "start_time"})
				changed = true
			}
			if blackoutCol.Fields.GetByName("end_time") == nil {
				blackoutCol.Fields.Add(&core.DateField{Name: "end_time"})
				changed = true
			}
			if blackoutCol.Fields.GetByName("property_id") == nil {
				blackoutCol.Fields.Add(&core.TextField{Name: "property_id"})
				changed = true
			}
			if changed {
				_ = app.Save(blackoutCol)
			}
		}

		cols := []string{"blackout_periods", "stations", "station_types", "tier_prices", "staff_accounts"}
		for _, name := range cols {
			col, err := app.FindCollectionByNameOrId(name)
			if err == nil && col != nil {
				unlocked := ""
				col.ListRule = &unlocked
				col.ViewRule = &unlocked
				col.CreateRule = &unlocked
				col.UpdateRule = &unlocked
				col.DeleteRule = &unlocked
				_ = app.Save(col)
			}
		}
		return e.Next()
	})

	// Auto-assign ID if missing for blackout_periods
	app.OnRecordCreateRequest("blackout_periods").BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Record.Id == "" {
			e.Record.Set("id", security.RandomString(15))
		}
		return e.Next()
	})

	// 1. Prevent deleting stations with active bookings
	app.OnRecordDeleteRequest("stations").BindFunc(func(e *core.RecordRequestEvent) error {
		stationId := e.Record.Id

		activeBookings, err := e.App.CountRecords(
			"bookings",
			dbx.NewExp(
				"assigned_station_id = {:station} AND (status = 'pending' OR status = 'confirmed')",
				dbx.Params{"station": stationId},
			),
		)

		if err != nil {
			return apis.NewBadRequestError("Failed to verify active bookings for station", err)
		}

		if activeBookings > 0 {
			return apis.NewBadRequestError("Cannot delete this station. It has active bookings.", nil)
		}

		return e.Next()
	})

	// 2. Prevent putting a station into maintenance if it has upcoming confirmed bookings
	app.OnRecordUpdateRequest("stations").BindFunc(func(e *core.RecordRequestEvent) error {
		original := e.Record.Original()
		
		// If status is changing to maintenance
		if original.GetString("status") != "maintenance" && e.Record.GetString("status") == "maintenance" {
			stationId := e.Record.Id
			nowStr := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")

			futureBookings, err := e.App.CountRecords(
				"bookings",
				dbx.NewExp(
					"assigned_station_id = {:station} AND status = 'confirmed' AND end_time > {:now}",
					dbx.Params{
						"station": stationId,
						"now": nowStr,
					},
				),
			)

			if err != nil {
				return apis.NewBadRequestError("Failed to verify future bookings", err)
			}

			if futureBookings > 0 {
				return apis.NewBadRequestError(fmt.Sprintf("Cannot put station into maintenance. There are %d future confirmed bookings.", futureBookings), nil)
			}
		}

		return e.Next()
	})
}
