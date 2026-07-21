package routes

import (
	"fmt"
	"net/http"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"gamez-backend/logger"
)

func RegisterBookingRoutes(app *pocketbase.PocketBase) {
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {

		// Dedicated server-controlled route to confirm a booking
		se.Router.POST("/api/custom/bookings/{id}/confirm", func(e *core.RequestEvent) error {
			// Require staff/admin authentication to access this endpoint
			// (Front-desk pays and staff hits confirm)
			if !e.HasSuperuserAuth() {
				return apis.NewForbiddenError("Only staff can confirm bookings", nil)
			}

			id := e.Request.PathValue("id")
			
			// Fetch the booking record
			record, err := app.FindRecordById("bookings", id)
			if err != nil {
				return apis.NewNotFoundError("Booking not found", err)
			}

			// Transition status from pending -> confirmed
			if record.GetString("status") != "pending" {
				return apis.NewBadRequestError(fmt.Sprintf("Cannot confirm a booking that is already %s", record.GetString("status")), nil)
			}

			record.Set("status", "confirmed")
			
			if err := app.Save(record); err != nil {
				logger.Error("ROUTES", fmt.Sprintf("Failed to confirm booking %s: %v", id, err))
				return apis.NewBadRequestError("Failed to save confirmation", err)
			}

			logger.Info("ROUTES", fmt.Sprintf("Booking %s successfully confirmed by staff", id))

			// Return the updated record
			return e.JSON(http.StatusOK, record)
		})

		return se.Next()
	})
}
