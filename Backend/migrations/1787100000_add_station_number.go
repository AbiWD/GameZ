package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// 1. Ensure property_id field exists in stations, station_types, and bookings
		for _, name := range []string{"stations", "station_types", "bookings"} {
			c, err := app.FindCollectionByNameOrId(name)
			if err == nil && c != nil {
				if c.Fields.GetByName("property_id") == nil {
					c.Fields.Add(&core.TextField{Name: "property_id"})
					if err := app.Save(c); err != nil {
						return err
					}
				}
			}
		}

		// 2. Ensure station_number field exists on stations
		stations, err := app.FindCollectionByNameOrId("stations")
		if err == nil && stations != nil {
			if stations.Fields.GetByName("station_number") == nil {
				stations.Fields.Add(&core.TextField{Name: "station_number"})
				if err := app.Save(stations); err != nil {
					return err
				}
			}
		}

		// 3. Ensure price fields exist on station_types (base_price, hourly_rate, price_per_hour)
		stTypes, err := app.FindCollectionByNameOrId("station_types")
		if err == nil && stTypes != nil {
			changed := false
			for _, fieldName := range []string{"base_price", "hourly_rate", "price_per_hour"} {
				if stTypes.Fields.GetByName(fieldName) == nil {
					stTypes.Fields.Add(&core.NumberField{Name: fieldName})
					changed = true
				}
			}
			if changed {
				if err := app.Save(stTypes); err != nil {
					return err
				}
			}
		}

		return nil
	}, func(app core.App) error {
		return nil
	})
}
