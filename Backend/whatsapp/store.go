package whatsapp

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/mail"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/mailer"
	"github.com/skip2/go-qrcode"

	"go.mau.fi/whatsmeow"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	waStore "go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waTypes "go.mau.fi/whatsmeow/types"
	waEvents "go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"

	_ "modernc.org/sqlite"
)

type WhatsAppService struct {
	app        core.App
	container  *sqlstore.Container
	client     *whatsmeow.Client
	qrChan     <-chan whatsmeow.QRChannelItem
	currentQR  string
	alertSent  bool
	mu         sync.RWMutex
	log        waLog.Logger
}

var (
	GlobalService *WhatsAppService
	once          sync.Once
)

func InitWhatsAppService(app core.App) (*WhatsAppService, error) {
	var err error
	once.Do(func() {
		dataDir := app.DataDir()
		if dataDir == "" {
			dataDir = "pb_data"
		}
		// Dedicated isolated DB file for whatsmeow session keys only
		dbPath := filepath.Join(dataDir, "whatsapp_session.db")
		_ = os.MkdirAll(filepath.Dir(dbPath), 0755)

		dbURI := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)", dbPath)

		logger := waLog.Stdout("WA", "WARN", true)

		b := false
		waStore.DeviceProps.RequireFullSync = &b

		ctx := context.Background()
		container, connErr := sqlstore.New(ctx, "sqlite", dbURI, logger)
		if connErr != nil {
			err = fmt.Errorf("failed to open whatsapp session DB: %w", connErr)
			return
		}

		deviceStore, storeErr := container.GetFirstDevice(ctx)
		if storeErr != nil {
			err = fmt.Errorf("failed to get whatsapp device store: %w", storeErr)
			return
		}

		client := whatsmeow.NewClient(deviceStore, logger)

		svc := &WhatsAppService{
			app:       app,
			container: container,
			client:    client,
			log:       logger,
		}

		client.AddEventHandler(svc.eventHandler)

		GlobalService = svc
	})

	if err != nil {
		return nil, err
	}

	return GlobalService, nil
}

func (s *WhatsAppService) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.client.Store.ID == nil {
		qrChan, err := s.client.GetQRChannel(ctx)
		if err != nil {
			return fmt.Errorf("failed to get QR channel: %w", err)
		}
		s.qrChan = qrChan

		err = s.client.Connect()
		if err != nil {
			return fmt.Errorf("failed to connect whatsapp client: %w", err)
		}

		go s.handleQRChannel()
	} else {
		err := s.client.Connect()
		if err != nil {
			return fmt.Errorf("failed to connect paired whatsapp client: %w", err)
		}
	}

	go s.heartbeatLoop()

	return nil
}

func (s *WhatsAppService) handleQRChannel() {
	for evt := range s.qrChan {
		if evt.Event == "code" {
			png, err := qrcode.Encode(evt.Code, qrcode.Medium, 256)
			if err == nil {
				b64 := base64.StdEncoding.EncodeToString(png)
				s.mu.Lock()
				s.currentQR = "data:image/png;base64," + b64
				s.mu.Unlock()
			}
		} else {
			s.mu.Lock()
			s.currentQR = ""
			s.mu.Unlock()
		}
	}
}

func (s *WhatsAppService) eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *waEvents.Connected:
		s.mu.Lock()
		s.currentQR = ""
		s.alertSent = false
		s.mu.Unlock()
		s.app.Logger().Info("WhatsApp Web client connected successfully", "module", "WHATSAPP")
	case *waEvents.LoggedOut:
		s.mu.Lock()
		s.currentQR = ""
		shouldAlert := !s.alertSent
		s.alertSent = true
		s.mu.Unlock()

		s.app.Logger().Warn("WhatsApp client logged out remotely!", "module", "WHATSAPP")
		if shouldAlert {
			s.sendAdminDisconnectAlert()
		}
	case *waEvents.PairSuccess:
		s.app.Logger().Info(fmt.Sprintf("WhatsApp pairing successful with JID: %s", v.ID.String()), "module", "WHATSAPP")
	}
}

func (s *WhatsAppService) IsConnected() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.client != nil && s.client.IsConnected() && s.client.IsLoggedIn()
}

func (s *WhatsAppService) GetStatus() (bool, string, string) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	connected := s.client != nil && s.client.IsConnected() && s.client.IsLoggedIn()
	phone := ""
	if connected && s.client.Store.ID != nil {
		phone = s.client.Store.ID.User
	}

	return connected, phone, s.currentQR
}

func (s *WhatsAppService) Disconnect() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.client != nil {
		ctx := context.Background()
		_ = s.client.Logout(ctx)
		s.client.Disconnect()
	}
	s.currentQR = ""
	return nil
}

func (s *WhatsAppService) SendTextMessage(ctx context.Context, phone string, text string) error {
	if !s.IsConnected() {
		return fmt.Errorf("whatsapp client is disconnected")
	}

	cleanPhone := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	if len(cleanPhone) == 10 {
		cleanPhone = "91" + cleanPhone
	}

	if len(cleanPhone) < 10 {
		return fmt.Errorf("invalid phone number length: %s", phone)
	}

	jid := waTypes.NewJID(cleanPhone, waTypes.DefaultUserServer)

	msg := &waProto.Message{
		Conversation: proto.String(text),
	}

	_, err := s.client.SendMessage(ctx, jid, msg)
	if err != nil {
		return fmt.Errorf("failed to send whatsapp text to %s: %w", cleanPhone, err)
	}

	return nil
}

func (s *WhatsAppService) heartbeatLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	wasConnected := s.IsConnected()

	for range ticker.C {
		currentlyConnected := s.IsConnected()
		if wasConnected && !currentlyConnected {
			s.mu.Lock()
			shouldAlert := !s.alertSent
			s.alertSent = true
			s.mu.Unlock()

			if shouldAlert {
				s.sendAdminDisconnectAlert()
			}
		}
		wasConnected = currentlyConnected
	}
}

func (s *WhatsAppService) sendAdminDisconnectAlert() {
	senderAddress := s.app.Settings().Meta.SenderAddress
	if senderAddress == "" {
		senderAddress = "noreply@gamez.com"
	}

	adminEmail := os.Getenv("ADMIN_ALERT_EMAIL")
	if adminEmail == "" {
		adminEmail = "abhilashbangera97@gmail.com"
	}

	subject := "🚨 GameZ Notice: Lounge WhatsApp Disconnected"
	body := `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #0d0b14; color: #fff; padding: 30px;">
  <div style="max-width: 500px; margin: 0 auto; background: #13111c; border-radius: 16px; p-6; border: 1px solid #ef4444; padding: 24px;">
    <h2 style="color: #ef4444; margin-top: 0;">🚨 WhatsApp Session Disconnected</h2>
    <p style="color: #cbd5e1; font-size: 14px;">The GameZ Lounge WhatsApp Web session has disconnected or un-paired.</p>
    <p style="color: #94a3b8; font-size: 13px;">Customer notifications are currently automatically falling back 100% to Cyber HTML Emails so no messages are lost.</p>
    <div style="margin-top: 20px; text-align: center;">
      <a href="http://localhost:8081/admin/whatsapp" style="background: #ef4444; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; inline-block;">Scan QR Code to Re-Pair</a>
    </div>
  </div>
</body>
</html>`

	msg := &mailer.Message{
		From: mail.Address{
			Address: senderAddress,
			Name:    "GameZ Alert",
		},
		To: []mail.Address{
			{Address: adminEmail},
		},
		Subject: subject,
		HTML:    body,
	}

	if err := s.app.NewMailClient().Send(msg); err != nil {
		s.app.Logger().Error("Failed to send disconnect alert email to admin", "admin_email", adminEmail, "error", err)
	} else {
		s.app.Logger().Info("Disconnect alert email sent to admin successfully", "admin_email", adminEmail)
	}
}
