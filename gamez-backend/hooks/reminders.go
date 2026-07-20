package hooks

import (
	"github.com/pocketbase/pocketbase"
	"gamez-backend/logger"
)

func RegisterReminderScheduler(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Reminder scheduler registered")
}
