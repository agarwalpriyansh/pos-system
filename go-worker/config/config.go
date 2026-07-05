package config

import (
	"os"
	"strconv"
	"strings"
)

// Configuration constants loaded from Env with safe fallbacks
type Config struct {
	RedisAddr         string
	RedisPassword     string
	RedisDB           int
	QueueName         string
	WorkerCount       int
	WhatsAppToken     string
	WhatsAppPhoneID   string
	WhatsAppAPIURL    string
	MockWhatsApp      bool
	BackendURL        string
	SMTPHost          string
	SMTPPort          int
	SMTPUsername      string
	SMTPPassword      string
	SMTPFromEmail     string
	MockEmail         bool
}

func LoadConfig() Config {
	workerCount, err := strconv.Atoi(getEnv("WORKER_COUNT", "5"))
	if err != nil {
		workerCount = 5
	}

	redisDB, err := strconv.Atoi(getEnv("REDIS_DB", "0"))
	if err != nil {
		redisDB = 0
	}

	smtpPort, err := strconv.Atoi(getEnv("SMTP_PORT", "587"))
	if err != nil {
		smtpPort = 587
	}

	mockWhatsApp := getEnv("MOCK_WHATSAPP_API", "true") == "true"
	mockEmail := getEnv("MOCK_EMAIL_API", "true") == "true"

	return Config{
		RedisAddr:       getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:   getEnv("REDIS_PASSWORD", ""),
		RedisDB:         redisDB,
		QueueName:       getEnv("REDIS_QUEUE_NAME", "queue:bills"),
		WorkerCount:     workerCount,
		WhatsAppToken:   getEnv("WHATSAPP_TOKEN", ""),
		WhatsAppPhoneID: getEnv("WHATSAPP_PHONE_NUMBER_ID", ""),
		WhatsAppAPIURL:  getEnv("WHATSAPP_API_URL", "https://graph.facebook.com/v18.0"),
		MockWhatsApp:    mockWhatsApp,
		BackendURL:      getEnv("BACKEND_URL", "http://localhost:5000"),
		SMTPHost:        getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:        smtpPort,
		SMTPUsername:    getEnv("SMTP_USERNAME", ""),
		SMTPPassword:    getEnv("SMTP_PASSWORD", ""),
		SMTPFromEmail:   getEnv("SMTP_FROM_EMAIL", ""),
		MockEmail:       mockEmail,
	}
}

func getEnv(key, fallback string) string {
	// A simple helper to parse local env files manually without third party packages
	// to ensure extreme compatibility and 0 errors during building
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	// Try parsing .env manually if exists in folder (check root path or relative path)
	data, err := os.ReadFile(".env")
	if err != nil {
		// fallback to check parent directory .env
		data, err = os.ReadFile("../.env")
	}
	if err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 && parts[0] == key {
				return strings.Trim(parts[1], "\r\"' ")
			}
		}
	}
	return fallback
}
