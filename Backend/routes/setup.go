package routes

import (
	"net/http"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

// RegisterSetupRoutes adds the missing setup-status route 
// so the Admin UI stops throwing 404 errors in the console.
func RegisterSetupRoutes(se *core.ServeEvent, app *pocketbase.PocketBase) {
	se.Router.GET("/api/gamez/setup-status", func(e *core.RequestEvent) error {
		// We always return false because PocketBase natively handles initial setup via the /_/ dashboard.
		return e.JSON(http.StatusOK, map[string]bool{
			"isSetupRequired": false,
		})
	})
}
