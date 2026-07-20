package routes

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"gamez-backend/logger"
)

func RegisterStationRoutes(se *core.ServeEvent, app *pocketbase.PocketBase) {
	logger.Info("ROUTES", "Station routes registered")
}
