package whatsapp

import (
	"context"
	"database/sql"
	"fmt"
	"net/mail"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/mailer"

	_ "modernc.org/sqlite"
)

type NotificationJob struct {
	ID             int64
	BookingID      string
	NotifType      string
	RecipientPhone string
	RecipientEmail string
	TextPayload    string
	EmailHTML      string
	EmailSubject   string
	Status         string
	Attempts       int
	CreatedAt      time.Time
}

type NotificationQueue struct {
	app     core.App
	db      *sql.DB
	svc     *WhatsAppService
	jobChan chan struct{} // Signal channel to wake up worker instantly
	mu      sync.Mutex
}

var GlobalQueue *NotificationQueue

func InitNotificationQueue(app core.App, svc *WhatsAppService) (*NotificationQueue, error) {
	dataDir := app.DataDir()
	if dataDir == "" {
		dataDir = "pb_data"
	}
	// Separate DB file strictly for notification queue & logs
	dbPath := filepath.Join(dataDir, "notification_queue.db")
	_ = os.MkdirAll(filepath.Dir(dbPath), 0755)

	dbURI := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)", dbPath)
	db, err := sql.Open("sqlite", dbURI)
	if err != nil {
		return nil, fmt.Errorf("failed to open notification queue DB: %w", err)
	}

	// Create tables if not exist
	schema := `
	CREATE TABLE IF NOT EXISTS notification_queue (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		booking_id TEXT NOT NULL,
		notif_type TEXT NOT NULL,
		recipient_phone TEXT,
		recipient_email TEXT,
		text_payload TEXT,
		email_html TEXT,
		email_subject TEXT,
		status TEXT NOT NULL DEFAULT 'pending',
		attempts INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS notification_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		booking_id TEXT NOT NULL,
		notif_type TEXT NOT NULL,
		channel TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(booking_id, notif_type)
	);
	`

	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("failed to create notification queue schema: %w", err)
	}

	q := &NotificationQueue{
		app:     app,
		db:      db,
		svc:     svc,
		jobChan: make(chan struct{}, 1000),
	}

	GlobalQueue = q

	// Start background worker goroutines
	go q.workerLoop()
	go q.periodicSweepLoop()

	return q, nil
}

func (q *NotificationQueue) Enqueue(bookingID, notifType, phone, email, textPayload, emailHTML, emailSubject string) error {
	q.mu.Lock()

	// Check if this (booking_id, notif_type) has already been logged in notification_logs
	var count int
	_ = q.db.QueryRow("SELECT COUNT(*) FROM notification_logs WHERE booking_id = ? AND notif_type = ?", bookingID, notifType).Scan(&count)
	if count > 0 {
		q.mu.Unlock()
		return nil // Idempotent skip: already processed
	}

	query := `INSERT INTO notification_queue (booking_id, notif_type, recipient_phone, recipient_email, text_payload, email_html, email_subject, status)
	VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`

	_, err := q.db.Exec(query, bookingID, notifType, phone, email, textPayload, emailHTML, emailSubject)
	q.mu.Unlock()

	if err != nil {
		return fmt.Errorf("failed to enqueue notification: %w", err)
	}

	// Wake up worker instantly via signal channel
	select {
	case q.jobChan <- struct{}{}:
	default:
	}

	return nil
}

func (q *NotificationQueue) workerLoop() {
	ticker := time.NewTicker(1500 * time.Millisecond) // 1.5s pacing
	defer ticker.Stop()

	for {
		select {
		case <-q.jobChan:
			// Instant wake up signal: fetch next job with status='processing' lock
			if job, ok := q.fetchNextJob(); ok {
				q.processJob(job)
			}
		case <-ticker.C:
			// Fallback ticker poll for pending/backoff jobs
			if job, ok := q.fetchNextJob(); ok {
				q.processJob(job)
			}
		}
	}
}

func (q *NotificationQueue) fetchNextJob() (NotificationJob, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()

	var job NotificationJob
	// Select pending jobs: attempts = 0 process immediately; attempts > 0 require 5-minute backoff delay
	query := `SELECT id, booking_id, notif_type, recipient_phone, recipient_email, text_payload, email_html, email_subject, attempts
	FROM notification_queue
	WHERE status = 'pending' AND attempts < 3 AND (attempts = 0 OR updated_at < datetime('now', '-300 seconds'))
	ORDER BY id ASC LIMIT 1`

	err := q.db.QueryRow(query).Scan(
		&job.ID, &job.BookingID, &job.NotifType, &job.RecipientPhone, &job.RecipientEmail,
		&job.TextPayload, &job.EmailHTML, &job.EmailSubject, &job.Attempts,
	)

	if err == sql.ErrNoRows {
		return job, false
	}
	if err != nil {
		return job, false
	}

	// Mark status = 'processing' immediately to lock
	_, _ = q.db.Exec("UPDATE notification_queue SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?", job.ID)

	return job, true
}

func (q *NotificationQueue) processJob(job NotificationJob) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var waErr error
	if q.svc != nil && q.svc.IsConnected() && job.RecipientPhone != "" {
		waErr = q.svc.SendTextMessage(ctx, job.RecipientPhone, job.TextPayload)
	} else {
		waErr = fmt.Errorf("whatsapp unavailable or recipient phone missing")
	}

	if waErr == nil {
		// WhatsApp send SUCCESS! Execute atomic SQLite transaction
		tx, err := q.db.Begin()
		if err == nil {
			_, _ = tx.Exec("INSERT OR IGNORE INTO notification_logs (booking_id, notif_type, channel) VALUES (?, ?, 'whatsapp')", job.BookingID, job.NotifType)
			_, _ = tx.Exec("UPDATE notification_queue SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?", job.ID)
			_ = tx.Commit()
		}
		q.app.Logger().Info("WhatsApp ticket sent successfully", "phone", job.RecipientPhone, "booking_id", job.BookingID)
	} else {
		// WhatsApp send FAILED! Trigger per-send Cyber Email fallback
		q.app.Logger().Warn("WhatsApp send failed. Triggering Email fallback...", "phone", job.RecipientPhone, "error", waErr)

		emailErr := q.sendEmailFallback(job)
		if emailErr == nil {
			tx, err := q.db.Begin()
			if err == nil {
				_, _ = tx.Exec("INSERT OR IGNORE INTO notification_logs (booking_id, notif_type, channel) VALUES (?, ?, 'email')", job.BookingID, job.NotifType)
				_, _ = tx.Exec("UPDATE notification_queue SET status = 'sent_via_fallback', updated_at = CURRENT_TIMESTAMP WHERE id = ?", job.ID)
				_ = tx.Commit()
			}
		} else {
			// Double failure (WhatsApp + Email both failed)
			newAttempts := job.Attempts + 1
			if newAttempts >= 3 {
				_, _ = q.db.Exec("UPDATE notification_queue SET status = 'failed', attempts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", newAttempts, job.ID)
				q.app.Logger().Error("Both WhatsApp and Email failed for booking", "booking_id", job.BookingID, "attempts", newAttempts, "error", emailErr)
			} else {
				// Re-mark pending for backoff retry
				_, _ = q.db.Exec("UPDATE notification_queue SET status = 'pending', attempts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", newAttempts, job.ID)
				q.app.Logger().Warn("Both WhatsApp and Email failed for booking. Will retry in 5 mins.", "booking_id", job.BookingID, "attempt", newAttempts)
			}
		}
	}
}

func (q *NotificationQueue) sendEmailFallback(job NotificationJob) error {
	if job.RecipientEmail == "" {
		return fmt.Errorf("no recipient email provided for fallback")
	}

	subject := job.EmailSubject
	if subject == "" {
		subject = "GameZ Lounge Notification"
	}

	senderAddress := q.app.Settings().Meta.SenderAddress
	if senderAddress == "" {
		return fmt.Errorf("SenderAddress is unconfigured")
	}

	msg := &mailer.Message{
		From: mail.Address{
			Address: senderAddress,
			Name:    q.app.Settings().Meta.SenderName,
		},
		To: []mail.Address{
			{Address: job.RecipientEmail},
		},
		Subject: subject,
		HTML:    job.EmailHTML,
	}

	return q.app.NewMailClient().Send(msg)
}

func (q *NotificationQueue) periodicSweepLoop() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		q.sweepStuckProcessingJobs()
		q.purgeOldSentJobs()
	}
}

func (q *NotificationQueue) sweepStuckProcessingJobs() {
	q.mu.Lock()
	defer q.mu.Unlock()

	rows, err := q.db.Query(`SELECT id, booking_id, notif_type FROM notification_queue
	WHERE status = 'processing' AND updated_at < datetime('now', '-60 seconds')`)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id int64
		var bID, nType string
		if err := rows.Scan(&id, &bID, &nType); err != nil {
			continue
		}

		var count int
		_ = q.db.QueryRow("SELECT COUNT(*) FROM notification_logs WHERE booking_id = ? AND notif_type = ?", bID, nType).Scan(&count)
		if count > 0 {
			_, _ = q.db.Exec("UPDATE notification_queue SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?", id)
		} else {
			_, _ = q.db.Exec("UPDATE notification_queue SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?", id)
		}
	}
	if err := rows.Err(); err != nil {
		q.app.Logger().Error("Error scanning stuck processing jobs", "error", err)
	}
}

func (q *NotificationQueue) purgeOldSentJobs() {
	_, _ = q.db.Exec("DELETE FROM notification_queue WHERE status IN ('sent', 'sent_via_fallback') AND updated_at < datetime('now', '-30 days')")
}

// Bounded Worker Pool (Max 10 Concurrent) for Parallel Emergency Blackout Email Dispatch with Error Tracking
func (q *NotificationQueue) DispatchParallelBlackoutEmails(jobs []NotificationJob) {
	sem := make(chan struct{}, 10)
	var wg sync.WaitGroup

	var successCount, failCount int64
	var countMu sync.Mutex

	for _, j := range jobs {
		wg.Add(1)
		job := j
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			err := q.sendEmailFallback(job)
			countMu.Lock()
			if err == nil {
				successCount++
			} else {
				failCount++
				q.app.Logger().Error("Failed to send blackout emergency email", "email", job.RecipientEmail, "booking_id", job.BookingID, "error", err)
			}
			countMu.Unlock()
		}()
	}

	wg.Wait()
	q.app.Logger().Info("Blackout emergency email dispatch complete", "success", successCount, "failed", failCount)
}

