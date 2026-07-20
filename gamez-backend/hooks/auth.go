package hooks

import (
	"github.com/pocketbase/pocketbase"
	"gamez-backend/logger"
)

func RegisterAuthHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Auth hooks registered")
}
