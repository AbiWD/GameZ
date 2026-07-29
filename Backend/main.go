package main

import (
	"embed"
	"io/fs"
	"os"
	"strconv"

	"github.com/joho/godotenv"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	"gamez-backend/hooks"
	"gamez-backend/logger"
	"gamez-backend/routes"

	_ "gamez-backend/migrations"
)

//go:embed ui/admin/*
var adminDist embed.FS

const (
	apiURL      = "http://localhost:8090"
	frontendURL = "http://localhost:4173"
)

func setupS3(app *pocketbase.PocketBase) {
	if os.Getenv("S3_ENABLED") != "true" {
		logger.Info("S3", "S3 disabled — using local storage")
		return
	}

	logger.Info("S3", "Configuring AWS S3...")

	settings := app.Settings()
	settings.S3.Enabled = true
	settings.S3.Bucket = os.Getenv("S3_BUCKET")
	settings.S3.Region = os.Getenv("S3_REGION")
	settings.S3.AccessKey = os.Getenv("S3_ACCESS_KEY")
	settings.S3.Secret = os.Getenv("S3_SECRET_KEY")

	endpoint := os.Getenv("S3_ENDPOINT")
	if endpoint == "" {
		endpoint = "https://s3." + settings.S3.Region + ".amazonaws.com"
	}
	settings.S3.Endpoint = endpoint

	if err := app.Save(settings); err != nil {
		logger.Errorf("S3", "Config failed: %v", err)
	} else {
		logger.Infof("S3", "Configured → bucket: %s region: %s",
			settings.S3.Bucket, settings.S3.Region)
	}
}

func setupSMTP(app *pocketbase.PocketBase) {
	host := os.Getenv("SMTP_HOST")
	if host == "" || host == "smtp.example.com" {
		logger.Warn("SMTP", "SMTP_HOST not set or contains placeholder — preserving PocketBase UI settings")
		return
	}

	logger.Info("SMTP", "Configuring SMTP...")

	port := 587
	if p := os.Getenv("SMTP_PORT"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil {
			port = parsed
		}
	}

	settings := app.Settings()
	settings.SMTP.Enabled = true
	settings.SMTP.Host = host
	settings.SMTP.Port = port
	settings.SMTP.Username = os.Getenv("SMTP_USERNAME")
	settings.SMTP.Password = os.Getenv("SMTP_PASSWORD")
	settings.Meta.SenderAddress = os.Getenv("SMTP_FROM")
	settings.Meta.SenderName = "GameZ"

	if err := app.Save(settings); err != nil {
		logger.Errorf("SMTP", "Config failed: %v", err)
	} else {
		logger.Infof("SMTP", "Configured → %s:%d", host, port)
	}
}

func setupEmailTemplates(app *pocketbase.PocketBase) {
	logger.Info("SYSTEM", "Configuring email templates...")

	users, err := app.FindCollectionByNameOrId("portal_users")
	if err != nil {
		logger.Errorf("SYSTEM", "Could not find portal_users collection: %v", err)
		return
	}

	// ── Verification Email ──
	users.VerificationTemplate.Subject = "Verify your GameZ account"
	users.VerificationTemplate.Body = `<!DOCTYPE html>
<html>
<body style="font-family:helvetica,arial,sans-serif;background:#030712;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#111827;border-radius:16px;padding:40px;border:1px solid #1f2937;">
    <h1 style="color:#8b5cf6;letter-spacing:0.15em;font-size:24px;margin:0 0 24px;font-weight:900;">GAMEZ</h1>
    <h2 style="color:#f9fafb;font-size:18px;margin:0 0 8px;">Verify your email address</h2>
    <p style="color:#9ca3af;font-size:14px;margin-bottom:24px;">
      Welcome to the ultimate gaming lounge.<br/><br/>
      Please click the button below to verify your email address and activate your account.
    </p>
    <a href="` + frontendURL + `/verify?token={TOKEN}"
       target="_blank"
       rel="noopener"
       style="display:inline-block;background:linear-gradient(to right, #8b5cf6, #06b6d4);color:white;padding:12px 28px;
              border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
      Verify Email Address
    </a>
    <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
      If the button does not work, copy and paste this link into your browser:
    </p>
    <p style="word-break:break-all;font-size:12px;color:#06b6d4;">
      ` + frontendURL + `/verify?token={TOKEN}
    </p>
    <p style="color:#4b5563;font-size:12px;margin-top:24px;">
      If you did not create an account you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #1f2937;margin:32px 0;"/>
    <p style="color:#4b5563;font-size:12px;margin:0;">
      © 2026 GameZ Mangaluru ·
      <a href="mailto:support@gamezcafe.com" style="color:#8b5cf6;">support@gamezcafe.com</a>
    </p>
  </div>
</body>
</html>`

	// ── Password Reset Email ──
	users.ResetPasswordTemplate.Subject = "Reset your GameZ password"
	users.ResetPasswordTemplate.Body = `<!DOCTYPE html>
<html>
<body style="font-family:helvetica,arial,sans-serif;background:#030712;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#111827;border-radius:16px;padding:40px;border:1px solid #1f2937;">
    <h1 style="color:#8b5cf6;letter-spacing:0.15em;font-size:24px;margin:0 0 24px;font-weight:900;">GAMEZ</h1>
    <h2 style="color:#f9fafb;font-size:18px;margin:0 0 8px;">Reset your password</h2>
    <p style="color:#9ca3af;font-size:14px;margin-bottom:24px;">
      We received a request to reset your GameZ password.<br/><br/>
      Click the button below to choose a new password.
    </p>
    <a href="` + frontendURL + `/#reset-password?token={TOKEN}"
       target="_blank"
       rel="noopener"
       style="display:inline-block;background:linear-gradient(to right, #8b5cf6, #06b6d4);color:white;padding:12px 28px;
              border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
      Reset Password
    </a>
    <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
      If the button does not work, copy and paste this link into your browser:
    </p>
    <p style="word-break:break-all;font-size:12px;color:#06b6d4;">
      ` + frontendURL + `/#reset-password?token={TOKEN}
    </p>
    <p style="color:#4b5563;font-size:12px;margin-top:24px;">
      If you did not request a password reset you can safely ignore this email.
      This link expires in 30 minutes.
    </p>
    <hr style="border:none;border-top:1px solid #1f2937;margin:32px 0;"/>
    <p style="color:#4b5563;font-size:12px;margin:0;">
      © 2026 GameZ Mangaluru ·
      <a href="mailto:support@gamezcafe.com" style="color:#8b5cf6;">support@gamezcafe.com</a>
    </p>
  </div>
</body>
</html>`

	// ── Email Change Email ──
	users.ConfirmEmailChangeTemplate.Subject = "Confirm your new GameZ email"
	users.ConfirmEmailChangeTemplate.Body = `<!DOCTYPE html>
<html>
<body style="font-family:helvetica,arial,sans-serif;background:#030712;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#111827;border-radius:16px;padding:40px;border:1px solid #1f2937;">
    <h1 style="color:#8b5cf6;letter-spacing:0.15em;font-size:24px;margin:0 0 24px;font-weight:900;">GAMEZ</h1>
    <h2 style="color:#f9fafb;font-size:18px;margin:0 0 8px;">Confirm your new email</h2>
    <p style="color:#9ca3af;font-size:14px;margin-bottom:24px;">
      Please click the button below to confirm your new email address.
    </p>
    <a href="` + apiURL + `/_/#/auth/confirm-email-change/{TOKEN}"
       target="_blank"
       rel="noopener"
       style="display:inline-block;background:linear-gradient(to right, #8b5cf6, #06b6d4);color:white;padding:12px 28px;
              border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
      Confirm New Email
    </a>
    <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
      If the button does not work, copy and paste this link into your browser:
    </p>
    <p style="word-break:break-all;font-size:12px;color:#06b6d4;">
      ` + apiURL + `/_/#/auth/confirm-email-change/{TOKEN}
    </p>
    <p style="color:#4b5563;font-size:12px;margin-top:24px;">
      If you did not request this change please contact us immediately.
    </p>
    <hr style="border:none;border-top:1px solid #1f2937;margin:32px 0;"/>
    <p style="color:#4b5563;font-size:12px;margin:0;">
      © 2026 GameZ Mangaluru ·
      <a href="mailto:support@gamezcafe.com" style="color:#8b5cf6;">support@gamezcafe.com</a>
    </p>
  </div>
</body>
</html>`

	// ── Save App Meta ──
	settings := app.Settings()
	settings.Meta.AppName = "GameZ"
	settings.Meta.AppURL = apiURL
	if err := app.Save(settings); err != nil {
		logger.Errorf("SYSTEM", "Meta settings failed: %v", err)
	}

	// ── Save users collection ──
	if err := app.Save(users); err != nil {
		logger.Errorf("SYSTEM", "Email templates save failed: %v", err)
	} else {
		logger.Info("SYSTEM", "Email templates configured ✅")
	}
}



func main() {
	// ── Load .env ──
	if err := godotenv.Load(); err != nil {
		// Log but don't fatal, allowing default env to run
		logger.Warn("SYSTEM", ".env file not found, using defaults")
	}

	// ── Initialize Logger ──
	logPath := os.Getenv("LOG_PATH")
	if logPath == "" {
		logPath = "./logs"
	}
	if err := logger.Init(logPath); err != nil {
		// If logger init fails, fallback to basic print
		println("Logger init failed: ", err.Error())
		os.Exit(1)
	}
	defer logger.Close()

	logger.Infof("SYSTEM", "Environment: %s", os.Getenv("APP_ENV"))

	app := pocketbase.New()

	// ── Auto migrate ──
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	// ── Bootstrap ──
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {

		// CORS
		se.Router.Bind(apis.CORS(apis.CORSConfig{
			AllowOrigins: []string{
				"http://localhost:4173",
				"http://localhost:8080",
				"http://localhost:8081",
				"http://127.0.0.1:4173",
				"http://127.0.0.1:8080",
				"http://127.0.0.1:8081",
				"https://gamezcafe.com",
				"https://www.gamezcafe.com",
			},
			AllowMethods: []string{
				"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
			},
			AllowHeaders: []string{
				"Content-Type", "Authorization", "X-Token",
			},
			AllowCredentials: true,
		}))

		// S3 + SMTP + Email Templates
		setupS3(app)
		setupSMTP(app)
		setupEmailTemplates(app)



		// Custom routes
		routes.RegisterAnalyticsRoutes(se, app)
		routes.RegisterStationRoutes(se, app)
		routes.RegisterSetupRoutes(se, app)

		// ── SPA Fallback for Custom Admin UI ──
		// Note: /admin/ serves the custom React GameZ Admin Panel.
		// PocketBase's built-in core superuser dashboard remains at /_/.
		adminSub, err := fs.Sub(adminDist, "ui/admin")
		if err != nil {
			logger.Errorf("SYSTEM", "Failed to sub embed.FS: %v", err)
		} else {
			se.Router.GET("/admin/{path...}", apis.Static(adminSub, true))
		}

		// ── SPA Fallback for Customer Website (pb_public) ──
		// Serves customer website from pb_public at /
		se.Router.GET("/{path...}", apis.Static(os.DirFS("./pb_public"), true))

		logger.Info("SYSTEM", "Server bootstrap complete")
		return se.Next()
	})

	// ── Request logging ──
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		se.Router.BindFunc(func(e *core.RequestEvent) error {
			logger.Infof("HTTP", "%s %s",
				e.Request.Method,
				e.Request.URL.Path,
			)
			return e.Next()
		})
		return se.Next()
	})

	// ── Hooks ──
	hooks.RegisterAuditHooks(app)
	hooks.RegisterAuthHooks(app)
	hooks.RegisterBookingHooks(app)
	hooks.RegisterStationHooks(app)
	hooks.RegisterReminderScheduler(app)
	routes.RegisterBookingRoutes(app)

	logger.Info("SYSTEM", "Starting GameZ Backend...")

	if err := app.Start(); err != nil {
		logger.Fatalf("SYSTEM", "Server failed: %v", err)
	}
}
