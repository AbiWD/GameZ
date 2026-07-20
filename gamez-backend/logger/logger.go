package logger

import (
	"fmt"
	"log"
	"os"
	"runtime"
	"time"
)

// ── Log Levels ──
const (
	LevelDebug = "DEBUG"
	LevelInfo  = "INFO"
	LevelWarn  = "WARN"
	LevelError = "ERROR"
	LevelFatal = "FATAL"
)

var (
	logFile *os.File
	logger  *log.Logger
)

// ── Init — call this in main.go ──
func Init(logPath string) error {
	// Create logs directory if not exists
	if err := os.MkdirAll(logPath, 0755); err != nil {
		return fmt.Errorf("failed to create log dir: %w", err)
	}

	// Create log file with date
	today := time.Now().Format("2006-01-02")
	filePath := fmt.Sprintf("%s/gamez-%s.log", logPath, today)

	file, err := os.OpenFile(
		filePath,
		os.O_CREATE|os.O_WRONLY|os.O_APPEND,
		0644,
	)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	logFile = file
	logger = log.New(file, "", 0)

	Info("SYSTEM", "Logger initialized → "+filePath)
	return nil
}

// ── Close log file ──
func Close() {
	if logFile != nil {
		logFile.Close()
	}
}

// ── Format log entry ──
func write(level, module, message string) {
	now := time.Now().Format("2006-01-02 15:04:05")

	// Get caller info
	_, file, line, ok := runtime.Caller(2)
	caller := "unknown"
	if ok {
		// Get just filename
		short := file
		for i := len(file) - 1; i > 0; i-- {
			if file[i] == '/' {
				short = file[i+1:]
				break
			}
		}
		caller = fmt.Sprintf("%s:%d", short, line)
	}

	entry := fmt.Sprintf(
		"[%s] [%s] [%s] [%s] %s",
		now, level, module, caller, message,
	)

	// Write to file
	if logger != nil {
		logger.Println(entry)
	}

	// Always write to stdout too (journalctl picks this up)
	fmt.Println(entry)
}

// ── Public logging functions ──

func Debug(module, message string) {
	write(LevelDebug, module, message)
}

func Info(module, message string) {
	write(LevelInfo, module, message)
}

func Warn(module, message string) {
	write(LevelWarn, module, message)
}

func Error(module, message string) {
	write(LevelError, module, message)
}

func Fatal(module, message string) {
	write(LevelFatal, module, message)
	os.Exit(1)
}

// ── Formatted versions ──

func Debugf(module, format string, args ...any) {
	Debug(module, fmt.Sprintf(format, args...))
}

func Infof(module, format string, args ...any) {
	Info(module, fmt.Sprintf(format, args...))
}

func Warnf(module, format string, args ...any) {
	Warn(module, fmt.Sprintf(format, args...))
}

func Errorf(module, format string, args ...any) {
	Error(module, fmt.Sprintf(format, args...))
}

func Fatalf(module, format string, args ...any) {
	Fatal(module, fmt.Sprintf(format, args...))
}
