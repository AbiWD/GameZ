package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		stCol, err := app.FindCollectionByNameOrId("station_types")
		if err != nil || stCol == nil {
			return nil
		}

		// 1. Additive check for features (JSONField)
		if stCol.Fields.GetByName("features") == nil {
			stCol.Fields.Add(&core.JSONField{Name: "features"})
		}

		// 2. Additive check for image (FileField)
		if stCol.Fields.GetByName("image") == nil {
			stCol.Fields.Add(&core.FileField{
				Name:      "image",
				MaxSelect: 1,
				MaxSize:   5242880, // 5MB limit
				MimeTypes: []string{"image/png", "image/jpeg", "image/webp", "image/svg+xml"},
				Thumbs:    []string{"100x100", "400x300"},
			})
		}

		// 3. Additive check for specs (TextField)
		if stCol.Fields.GetByName("specs") == nil {
			stCol.Fields.Add(&core.TextField{Name: "specs"})
		}

		// 4. Enforce strict API Rules: Public Read, Staff Accounts Allowlist Write Only
		publicRule := ""
		staffAllowlistRule := "@request.auth.collectionName = 'staff_accounts'"
		
		stCol.ListRule = types.Pointer(publicRule)
		stCol.ViewRule = types.Pointer(publicRule)
		stCol.CreateRule = types.Pointer(staffAllowlistRule)
		stCol.UpdateRule = types.Pointer(staffAllowlistRule)
		stCol.DeleteRule = types.Pointer(staffAllowlistRule)

		if err := app.Save(stCol); err != nil {
			return err
		}

		return nil
	}, func(app core.App) error {
		return nil
	})
}
