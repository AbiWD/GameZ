package hooks

import (
	"fmt"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/apis"
	"gamez-backend/logger"
)

func RegisterStationHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Station hooks registered")

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
