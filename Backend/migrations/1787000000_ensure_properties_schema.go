package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		// 1. Ensure properties collection exists
		col, err := app.FindCollectionByNameOrId("properties")
		if err != nil || col == nil {
			col = core.NewCollection(core.CollectionTypeBase, "properties")
			col.Id = "pbc_properties"
			col.Fields.Add(&core.TextField{Name: "name", Required: true})
			col.Fields.Add(&core.TextField{Name: "address"})
			col.Fields.Add(&core.TextField{Name: "contact_email"})
			col.Fields.Add(&core.TextField{Name: "contact_phone"})
			col.Fields.Add(&core.BoolField{Name: "is_active"})
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

		// 2. Ensure default property record exists
		records, err := app.FindAllRecords("properties")
		if err != nil || len(records) == 0 {
			record := core.NewRecord(col)
			record.Set("name", "GameZ Cafe")
			record.Set("address", "MG Road, Mangaluru")
			record.Set("contact_email", "info@gamez.in")
			record.Set("contact_phone", "+91 98765 43210")
			record.Set("is_active", true)
			_ = app.Save(record)
		}

		return nil
	}, func(app core.App) error {
		return nil
	})
}
