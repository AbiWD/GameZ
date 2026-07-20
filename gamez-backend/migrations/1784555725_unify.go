package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// --- 1. Audit Logs ---
		auditLogs := core.NewBaseCollection("audit_logs")
		auditLogs.Fields.Add(&core.TextField{Name: "collection_name"})
		auditLogs.Fields.Add(&core.TextField{Name: "record_id"})
		auditLogs.Fields.Add(&core.TextField{Name: "action"})
		auditLogs.Fields.Add(&core.JSONField{Name: "details"})
		auditLogs.Fields.Add(&core.TextField{Name: "admin_id"})
		
		if err := app.Save(auditLogs); err != nil {
			return err
		}

		// --- 2. Stations ---
		stations := core.NewBaseCollection("stations")
		stations.Fields.Add(&core.TextField{Name: "name"})
		stations.Fields.Add(&core.SelectField{
			Name: "type",
			Values: []string{"pc", "console", "vr", "racing"},
			MaxSelect: 1,
		})
		stations.Fields.Add(&core.SelectField{
			Name: "status",
			Values: []string{"available", "maintenance", "reserved"},
			MaxSelect: 1,
		})
		stations.Fields.Add(&core.NumberField{Name: "rate_per_hour"})
		
		if err := app.Save(stations); err != nil {
			return err
		}

		// --- 3. Portal Users (Unify 'users') ---
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.Name = "portal_users"
		users.Fields.Add(&core.NumberField{Name: "total_visits"})
		users.Fields.Add(&core.NumberField{Name: "total_spent"})
		users.Fields.Add(&core.SelectField{
			Name: "status",
			MaxSelect: 1,
			Values: []string{"regular", "vip", "banned"},
		})
		users.Fields.Add(&core.TextField{Name: "notes"})
		if err := app.Save(users); err != nil {
			return err
		}

		// --- 4. Bookings ---
		bookings := core.NewBaseCollection("bookings")
		bookings.Fields.Add(&core.RelationField{
			Name: "assigned_station_id",
			CollectionId: stations.Id,
			MaxSelect: 1,
		})
		bookings.Fields.Add(&core.DateField{Name: "start_time"})
		bookings.Fields.Add(&core.DateField{Name: "end_time"})
		bookings.Fields.Add(&core.SelectField{
			Name: "status",
			Values: []string{"pending", "confirmed", "expired", "cancelled", "completed"},
			MaxSelect: 1,
		})
		bookings.Fields.Add(&core.RelationField{
			Name: "customer_id",
			CollectionId: users.Id,
			MaxSelect: 1,
		})
		bookings.Fields.Add(&core.TextField{Name: "hold_token"})
		bookings.Fields.Add(&core.DateField{Name: "expires_at"})
		bookings.Fields.Add(&core.NumberField{Name: "total_price"})
		bookings.Fields.Add(&core.NumberField{Name: "players"})
		bookings.Fields.Add(&core.TextField{Name: "name"})
		bookings.Fields.Add(&core.EmailField{Name: "email"})
		bookings.Fields.Add(&core.TextField{Name: "phone"})

		if err := app.Save(bookings); err != nil {
			return err
		}

		return nil
	}, func(app core.App) error {
		if b, err := app.FindCollectionByNameOrId("bookings"); err == nil {
			app.Delete(b)
		}
		if s, err := app.FindCollectionByNameOrId("stations"); err == nil {
			app.Delete(s)
		}
		if a, err := app.FindCollectionByNameOrId("audit_logs"); err == nil {
			app.Delete(a)
		}
		if u, err := app.FindCollectionByNameOrId("portal_users"); err == nil {
			u.Name = "users"
			u.Fields.RemoveByName("total_visits")
			u.Fields.RemoveByName("total_spent")
			u.Fields.RemoveByName("status")
			u.Fields.RemoveByName("notes")
			app.Save(u)
		}
		return nil
	})
}
