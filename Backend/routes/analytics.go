package routes

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"gamez-backend/logger"
)

func RegisterAnalyticsRoutes(se *core.ServeEvent, app *pocketbase.PocketBase) {
	logger.Info("ROUTES", "Analytics routes registered")
}
