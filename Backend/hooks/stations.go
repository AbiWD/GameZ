package hooks

import (
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
		// Ensure physical SQLite columns exist for blackout_periods & station_types
		_, _ = app.DB().NewQuery("ALTER TABLE blackout_periods ADD COLUMN start_time TEXT DEFAULT ''").Execute()
		_, _ = app.DB().NewQuery("ALTER TABLE blackout_periods ADD COLUMN end_time TEXT DEFAULT ''").Execute()
		_, _ = app.DB().NewQuery("ALTER TABLE blackout_periods ADD COLUMN property_id TEXT DEFAULT ''").Execute()
		_, _ = app.DB().NewQuery("ALTER TABLE blackout_periods ADD COLUMN reason TEXT DEFAULT ''").Execute()

		_, _ = app.DB().NewQuery("ALTER TABLE station_types ADD COLUMN features TEXT DEFAULT '[]'").Execute()
		_, _ = app.DB().NewQuery("ALTER TABLE station_types ADD COLUMN image TEXT DEFAULT ''").Execute()
		_, _ = app.DB().NewQuery("ALTER TABLE station_types ADD COLUMN specs TEXT DEFAULT ''").Execute()

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

		// Ensure API rules on station_types: Public read, Staff Accounts Allowlist write only
		if stCol, err := app.FindCollectionByNameOrId("station_types"); err == nil && stCol != nil {
			pubRule := ""
			staffAllowlistRule := "@request.auth.collectionName = 'staff_accounts'"
			stCol.ListRule = &pubRule
			stCol.ViewRule = &pubRule
			stCol.CreateRule = &staffAllowlistRule
			stCol.UpdateRule = &staffAllowlistRule
			stCol.DeleteRule = &staffAllowlistRule
			_ = app.Save(stCol)
		}

		cols := []string{"blackout_periods", "stations", "tier_prices", "staff_accounts", "portal_users"}
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

	// 2. Prevent putting a station into maintenance if it has upcoming bookings, or auto-reassign/cancel if alternative units exist
	app.OnRecordUpdateRequest("stations").BindFunc(func(e *core.RecordRequestEvent) error {
		original := e.Record.Original()
		
		// If status is changing to maintenance
		if original.GetString("status") != "maintenance" && e.Record.GetString("status") == "maintenance" {
			stationId := e.Record.Id
			now := time.Now().UTC()

			allBookings, err := e.App.FindAllRecords("bookings")
			if err != nil {
				return e.Next()
			}

			var futureBookings []*core.Record
			for _, bk := range allBookings {
				st := bk.GetString("status")
				stID := bk.GetString("assigned_station_id")
				eTime := bk.GetDateTime("end_time").Time()
				if stID == stationId && (st == "confirmed" || st == "pending") && eTime.After(now) {
					futureBookings = append(futureBookings, bk)
				}
			}

			if len(futureBookings) > 0 {
				stationRec := e.Record
				categoryName := stationRec.GetString("station_type")

				allStations, _ := e.App.FindAllRecords("stations")
				var otherStations []*core.Record
				for _, s := range allStations {
					sSt := s.GetString("status")
					if s.GetString("station_type") == categoryName && s.Id != stationId && (sSt == "available" || sSt == "active") {
						otherStations = append(otherStations, s)
					}
				}

				for _, booking := range futureBookings {
					bStart := booking.GetDateTime("start_time").Time()
					bEnd := booking.GetDateTime("end_time").Time()

					reassigned := false
					if len(otherStations) > 0 {
						for _, altStation := range otherStations {
							var conflicts int
							cErr := e.App.DB().Select("COUNT(*)").
								From("bookings").
								Where(dbx.NewExp(
									"assigned_station_id = {:altId} AND id != {:bId} AND (status = 'confirmed' OR status = 'pending') AND start_time < {:bEnd} AND end_time > {:bStart}",
									dbx.Params{
										"altId":  altStation.Id,
										"bId":    booking.Id,
										"bStart": bStart.Format("2006-01-02 15:04:05.000Z"),
										"bEnd":   bEnd.Format("2006-01-02 15:04:05.000Z"),
									},
								)).
								Row(&conflicts)

							if cErr == nil && conflicts == 0 {
								_, err := e.App.DB().NewQuery("UPDATE bookings SET assigned_station_id = {:altId} WHERE id = {:bId}").Bind(dbx.Params{
									"altId": altStation.Id,
									"bId":   booking.Id,
								}).Execute()
								if err == nil {
									reassigned = true
									logger.Infof("HOOKS", "Reassigned booking %s from %s to %s for maintenance", booking.Id, stationId, altStation.Id)
									break
								}
							}
						}
					}

					if !reassigned {
						_, _ = e.App.DB().NewQuery("UPDATE bookings SET status = 'cancelled' WHERE id = {:bId}").Bind(dbx.Params{
							"bId": booking.Id,
						}).Execute()
						logger.Infof("HOOKS", "Cancelled booking %s (%s) because station %s entered maintenance with no alternative unit available", booking.Id, booking.GetString("booking_reference"), stationId)
					}
				}
			}
		}

		return e.Next()
	})
}
