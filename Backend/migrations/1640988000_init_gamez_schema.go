package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		// 1. Ensure station_types collection
		if _, err := app.FindCollectionByNameOrId("station_types"); err != nil {
			col := core.NewCollection(core.CollectionTypeBase, "station_types")
			col.Id = "pbc_station_types"
			col.Fields.Add(&core.TextField{Name: "name", Required: true})
			col.Fields.Add(&core.TextField{Name: "description"})
			col.Fields.Add(&core.NumberField{Name: "hourly_rate"})
			col.Fields.Add(&core.NumberField{Name: "max_players"})
			col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			col.ListRule = types.Pointer("")
			col.ViewRule = types.Pointer("")
			col.CreateRule = types.Pointer("")
			col.UpdateRule = types.Pointer("")
			col.DeleteRule = types.Pointer("")
			if err := app.Save(col); err != nil {
				return err
			}
		}

		// 2. Ensure stations collection
		if _, err := app.FindCollectionByNameOrId("stations"); err != nil {
			col := core.NewCollection(core.CollectionTypeBase, "stations")
			col.Id = "pbc_stations"
			col.Fields.Add(&core.TextField{Name: "name", Required: true})
			col.Fields.Add(&core.TextField{Name: "station_type"})
			col.Fields.Add(&core.TextField{Name: "type_id"})
			col.Fields.Add(&core.TextField{Name: "status"}) // available, occupied, maintenance
			col.Fields.Add(&core.NumberField{Name: "hourly_rate"})
			col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			col.ListRule = types.Pointer("")
			col.ViewRule = types.Pointer("")
			col.CreateRule = types.Pointer("")
			col.UpdateRule = types.Pointer("")
			col.DeleteRule = types.Pointer("")
			if err := app.Save(col); err != nil {
				return err
			}
		}

		// 3. Ensure tier_prices collection
		if _, err := app.FindCollectionByNameOrId("tier_prices"); err != nil {
			col := core.NewCollection(core.CollectionTypeBase, "tier_prices")
			col.Id = "pbc_tier_prices"
			col.Fields.Add(&core.TextField{Name: "station_type_id"})
			col.Fields.Add(&core.NumberField{Name: "hours"})
			col.Fields.Add(&core.NumberField{Name: "price"})
			col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			col.ListRule = types.Pointer("")
			col.ViewRule = types.Pointer("")
			col.CreateRule = types.Pointer("")
			col.UpdateRule = types.Pointer("")
			col.DeleteRule = types.Pointer("")
			if err := app.Save(col); err != nil {
				return err
			}
		}

		// 4. Ensure portal_users collection (Auth)
		if _, err := app.FindCollectionByNameOrId("portal_users"); err != nil {
			col := core.NewCollection(core.CollectionTypeAuth, "portal_users")
			col.Id = "pbc_784419869"
			col.Fields.Add(&core.TextField{Name: "name"})
			col.Fields.Add(&core.TextField{Name: "phone"})
			col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			col.ListRule = types.Pointer("")
			col.ViewRule = types.Pointer("")
			col.CreateRule = types.Pointer("")
			col.UpdateRule = types.Pointer("")
			col.DeleteRule = types.Pointer("")
			if err := app.Save(col); err != nil {
				return err
			}
		}

		// 5. Ensure staff_accounts collection (Auth)
		if _, err := app.FindCollectionByNameOrId("staff_accounts"); err != nil {
			col := core.NewCollection(core.CollectionTypeAuth, "staff_accounts")
			col.Id = "pbc_1079353916"
			col.Fields.Add(&core.TextField{Name: "name"})
			col.Fields.Add(&core.TextField{Name: "phone"})
			col.Fields.Add(&core.SelectField{Name: "role", Values: []string{"admin", "manager", "staff"}})
			col.Fields.Add(&core.SelectField{Name: "status", Values: []string{"active", "suspended"}})
			col.Fields.Add(&core.BoolField{Name: "force_password_reset"})
			col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			col.ListRule = types.Pointer("")
			col.ViewRule = types.Pointer("")
			col.CreateRule = types.Pointer("")
			col.UpdateRule = types.Pointer("")
			col.DeleteRule = types.Pointer("")
			if err := app.Save(col); err != nil {
				return err
			}
		}

		// 6. Ensure bookings collection
		if _, err := app.FindCollectionByNameOrId("bookings"); err != nil {
			col := core.NewCollection(core.CollectionTypeBase, "bookings")
			col.Id = "pbc_bookings"
			col.Fields.Add(&core.TextField{Name: "booking_reference"})
			col.Fields.Add(&core.TextField{Name: "customer_id"})
			col.Fields.Add(&core.TextField{Name: "customer_name"})
			col.Fields.Add(&core.TextField{Name: "email"})
			col.Fields.Add(&core.TextField{Name: "phone"})
			col.Fields.Add(&core.TextField{Name: "assigned_station_id"})
			col.Fields.Add(&core.DateField{Name: "start_time"})
			col.Fields.Add(&core.DateField{Name: "end_time"})
			col.Fields.Add(&core.NumberField{Name: "duration_hours"})
			col.Fields.Add(&core.NumberField{Name: "total_price"})
			col.Fields.Add(&core.TextField{Name: "status"}) // pending, confirmed, cancelled, expired, completed
			col.Fields.Add(&core.TextField{Name: "payment_status"})
			col.Fields.Add(&core.DateField{Name: "expires_at"})
			col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			col.ListRule = types.Pointer("")
			col.ViewRule = types.Pointer("")
			col.CreateRule = types.Pointer("")
			col.UpdateRule = types.Pointer("")
			col.DeleteRule = types.Pointer("")
			if err := app.Save(col); err != nil {
				return err
			}
		}

		// 7. Ensure blackout_periods collection
		if _, err := app.FindCollectionByNameOrId("blackout_periods"); err != nil {
			col := core.NewCollection(core.CollectionTypeBase, "blackout_periods")
			col.Id = "pbc_blackout_periods"
			col.Fields.Add(&core.DateField{Name: "start_time"})
			col.Fields.Add(&core.DateField{Name: "end_time"})
			col.Fields.Add(&core.TextField{Name: "reason"})
			col.Fields.Add(&core.TextField{Name: "property_id"})
			col.Fields.Add(&core.AutodateField{Name: "created", OnCreate: true})
			col.Fields.Add(&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true})
			col.ListRule = types.Pointer("")
			col.ViewRule = types.Pointer("")
			col.CreateRule = types.Pointer("")
			col.UpdateRule = types.Pointer("")
			col.DeleteRule = types.Pointer("")
			if err := app.Save(col); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		return nil
	})
}
