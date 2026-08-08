package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3900885879")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"createRule": "@request.auth.collectionName = 'staff_accounts'",
			"deleteRule": "@request.auth.collectionName = 'staff_accounts'",
			"updateRule": "@request.auth.collectionName = 'staff_accounts'"
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3900885879")
		if err != nil {
			return err
		}

		// update collection data
		if err := json.Unmarshal([]byte(`{
			"createRule": "@request.auth.id != '' && @request.auth.collectionName != 'portal_users'",
			"deleteRule": "@request.auth.id != '' && @request.auth.collectionName != 'portal_users'",
			"updateRule": "@request.auth.id != '' && @request.auth.collectionName != 'portal_users'"
		}`), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
