package routes

import (
	"context"
	"net/http"
	"sync"
	"time"

	"gamez-backend/whatsapp"

	"github.com/pocketbase/pocketbase/core"
)

type rateLimiter struct {
	mu     sync.Mutex
	counts map[string]int
	reset  time.Time
}

var testLimiter = &rateLimiter{
	counts: make(map[string]int),
	reset:  time.Now().Add(1 * time.Minute),
}

func (rl *rateLimiter) Allow(adminID string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if time.Now().After(rl.reset) {
		rl.counts = make(map[string]int)
		rl.reset = time.Now().Add(1 * time.Minute)
	}

	if rl.counts[adminID] >= 3 {
		return false
	}

	rl.counts[adminID]++
	return true
}

func RegisterWhatsAppRoutes(se *core.ServeEvent, app core.App) {
	waGroup := se.Router.Group("/api/whatsapp")

	// Require Admin or Owner Auth for all WhatsApp Management APIs
	waGroup.BindFunc(func(e *core.RequestEvent) error {
		info, err := e.RequestInfo()
		if err != nil {
			return e.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		}

		isAdmin := e.HasSuperuserAuth()
		if !isAdmin && info.Auth != nil {
			// Any authenticated staff_accounts or superuser model
			isAdmin = true
		}

		if !isAdmin {
			return e.JSON(http.StatusForbidden, map[string]string{"error": "Admin permission required"})
		}

		return e.Next()
	})

	// GET /api/whatsapp/status
	waGroup.GET("/status", func(e *core.RequestEvent) error {
		if whatsapp.GlobalService == nil {
			return e.JSON(http.StatusOK, map[string]any{
				"connected": false,
				"phone":     "",
				"qr":        "",
			})
		}

		connected, phone, qr := whatsapp.GlobalService.GetStatus()
		return e.JSON(http.StatusOK, map[string]any{
			"connected": connected,
			"phone":     phone,
			"qr":        qr,
		})
	})

	// POST /api/whatsapp/qr - Force fresh QR channel generation
	waGroup.POST("/qr", func(e *core.RequestEvent) error {
		if whatsapp.GlobalService == nil {
			return e.JSON(http.StatusServiceUnavailable, map[string]string{"error": "WhatsApp service unavailable"})
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := whatsapp.GlobalService.ReconnectQR(ctx); err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}
		connected, phone, qr := whatsapp.GlobalService.GetStatus()
		return e.JSON(http.StatusOK, map[string]any{
			"connected": connected,
			"phone":     phone,
			"qr":        qr,
		})
	})

	// POST /api/whatsapp/disconnect
	waGroup.POST("/disconnect", func(e *core.RequestEvent) error {
		if whatsapp.GlobalService != nil {
			_ = whatsapp.GlobalService.Disconnect()
		}
		return e.JSON(http.StatusOK, map[string]string{"status": "disconnected"})
	})

	// POST /api/whatsapp/test
	waGroup.POST("/test", func(e *core.RequestEvent) error {
		info, err := e.RequestInfo()
		if err != nil {
			return e.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
		}

		adminID := "admin"
		if info.Auth != nil {
			adminID = info.Auth.Id
		}

		if !testLimiter.Allow(adminID) {
			return e.JSON(http.StatusTooManyRequests, map[string]string{"error": "Rate limit exceeded (Max 3 test messages per minute)"})
		}

		phone, _ := info.Body["phone"].(string)
		text, _ := info.Body["text"].(string)
		if text == "" {
			text, _ = info.Body["message"].(string)
		}

		if phone == "" || text == "" {
			return e.JSON(http.StatusBadRequest, map[string]string{"error": "Phone and text/message parameters are required"})
		}

		if whatsapp.GlobalService == nil || !whatsapp.GlobalService.IsConnected() {
			return e.JSON(http.StatusServiceUnavailable, map[string]string{"error": "WhatsApp service is disconnected"})
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := whatsapp.GlobalService.SendTextMessage(ctx, phone, text); err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		}

		return e.JSON(http.StatusOK, map[string]string{"status": "test_message_sent"})
	})
}
