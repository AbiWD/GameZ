package hooks

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/apis"
	"gamez-backend/logger"
)

func RegisterAuthHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Auth hooks registered")

	// 1. Prevent banned users from authenticating via Password
	app.OnRecordAuthWithPasswordRequest("portal_users").BindFunc(func(e *core.RecordAuthWithPasswordRequestEvent) error {
		if e.Record.GetString("status") == "banned" {
			return apis.NewForbiddenError("Your account has been suspended.", nil)
		}
		return e.Next()
	})

	// 2. Prevent banned users from authenticating via OAuth2
	app.OnRecordAuthWithOAuth2Request("portal_users").BindFunc(func(e *core.RecordAuthWithOAuth2RequestEvent) error {
		if e.Record.GetString("status") == "banned" {
			return apis.NewForbiddenError("Your account has been suspended.", nil)
		}
		return e.Next()
	})

	// 3. Prevent privilege escalation on registration
	app.OnRecordCreateRequest("portal_users").BindFunc(func(e *core.RecordRequestEvent) error {
		// Staff can bypass to create VIPs/banned directly
		if e.HasSuperuserAuth() {
			return e.Next()
		}
		
		// Force standard user status, ignoring any payload attempt to set 'vip'
		e.Record.Set("status", "regular")
		
		return e.Next()
	})
}
