package hooks

import (
	"github.com/pocketbase/pocketbase"
	"gamez-backend/logger"
)

func RegisterStationHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Station hooks registered")
}
