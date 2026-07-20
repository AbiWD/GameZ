package hooks

import (
	"github.com/pocketbase/pocketbase"
	"gamez-backend/logger"
)

func RegisterAuditHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Audit hooks registered")
}
