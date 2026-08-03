package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_784419869")
		if err != nil {
			collection, err = app.FindCollectionByNameOrId("portal_users")
			if err != nil {
				return nil
			}
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"oauth2": {
				"enabled": true
			}
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_784419869")
		if err != nil {
			collection, err = app.FindCollectionByNameOrId("portal_users")
			if err != nil {
				return nil
			}
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"oauth2": {
				"enabled": false
			}
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
