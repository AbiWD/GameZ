package hooks

import (
	"encoding/json"
	"fmt"
	"gamez-backend/logger"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func RegisterAuditHooks(app *pocketbase.PocketBase) {
	logger.Info("HOOKS", "Audit hooks registered")

	// Helper to extract admin ID from the request
	getAdminId := func(e *core.RecordRequestEvent) string {
		if e.Auth != nil && e.Auth.Collection().Name == "_superusers" {
			return e.Auth.Id
		}
		return ""
	}

	// Helper to check if a collection should be audited
	shouldAudit := func(collectionName string) bool {
		return collectionName == "bookings" || collectionName == "stations" || collectionName == "portal_users"
	}

	// 1. Audit CREATE
	app.OnRecordCreateRequest().BindFunc(func(e *core.RecordRequestEvent) error {
		nextErr := e.Next()
		if nextErr != nil || !shouldAudit(e.Record.Collection().Name) {
			return nextErr
		}

		adminId := getAdminId(e)
		details, _ := json.Marshal(e.Record.PublicExport())

		auditCollection, err := e.App.FindCollectionByNameOrId("audit_logs")
		if err == nil {
			auditRecord := core.NewRecord(auditCollection)
			auditRecord.Set("collection_name", e.Record.Collection().Name)
			auditRecord.Set("record_id", e.Record.Id)
			auditRecord.Set("action", "CREATE")
			auditRecord.Set("admin_id", adminId)
			auditRecord.Set("details", string(details))
			
			if err := e.App.SaveNoValidate(auditRecord); err != nil {
				logger.Error("AUDIT", fmt.Sprintf("Failed to save audit log: %v", err))
			}
		}

		return nil
	})

	// 2. Audit UPDATE
	app.OnRecordUpdateRequest().BindFunc(func(e *core.RecordRequestEvent) error {
		nextErr := e.Next()
		if nextErr != nil || !shouldAudit(e.Record.Collection().Name) {
			return nextErr
		}

		// Calculate JSON Diff
		original := e.Record.Original().PublicExport()
		updated := e.Record.PublicExport()
		diff := make(map[string]map[string]any)

		for k, v := range updated {
			origV, exists := original[k]
			// Quick stringification comparison for diffing
			if !exists || fmt.Sprintf("%v", origV) != fmt.Sprintf("%v", v) {
				diff[k] = map[string]any{"old": origV, "new": v}
			}
		}

		// Don't log if nothing materially changed
		if len(diff) == 0 {
			return nil
		}

		adminId := getAdminId(e)
		details, _ := json.Marshal(diff)

		auditCollection, err := e.App.FindCollectionByNameOrId("audit_logs")
		if err == nil {
			auditRecord := core.NewRecord(auditCollection)
			auditRecord.Set("collection_name", e.Record.Collection().Name)
			auditRecord.Set("record_id", e.Record.Id)
			auditRecord.Set("action", "UPDATE")
			auditRecord.Set("admin_id", adminId)
			auditRecord.Set("details", string(details))
			
			if err := e.App.SaveNoValidate(auditRecord); err != nil {
				logger.Error("AUDIT", fmt.Sprintf("Failed to save audit log: %v", err))
			}
		}

		return nil
	})

	// 3. Audit DELETE
	app.OnRecordDeleteRequest().BindFunc(func(e *core.RecordRequestEvent) error {
		nextErr := e.Next()
		if nextErr != nil || !shouldAudit(e.Record.Collection().Name) {
			return nextErr
		}

		adminId := getAdminId(e)
		details, _ := json.Marshal(e.Record.PublicExport())

		auditCollection, err := e.App.FindCollectionByNameOrId("audit_logs")
		if err == nil {
			auditRecord := core.NewRecord(auditCollection)
			auditRecord.Set("collection_name", e.Record.Collection().Name)
			auditRecord.Set("record_id", e.Record.Id)
			auditRecord.Set("action", "DELETE")
			auditRecord.Set("admin_id", adminId)
			auditRecord.Set("details", string(details))
			
			if err := e.App.SaveNoValidate(auditRecord); err != nil {
				logger.Error("AUDIT", fmt.Sprintf("Failed to save audit log: %v", err))
			}
		}

		return nil
	})
}
