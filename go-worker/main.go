package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
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

// QueueTask represents the structural schema pushed by Node.js
type QueueTask struct {
	BillID        string  `json:"billId"`
	InvoiceNumber string  `json:"invoiceNumber"`
	CustomerPhone string  `json:"customerPhone"`
	CustomerName  string  `json:"customerName"`
	CustomerEmail string  `json:"customerEmail"`
	Total         float64 `json:"total"`
	ItemsSummary  string  `json:"itemsSummary"`
}

func loadConfig() Config {
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
	// Try parsing .env manually if exists in folder
	data, err := os.ReadFile(".env")
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

func main() {
	config := loadConfig()
	log.Printf("[Worker Init] Starting POS WhatsApp/Email service worker...")
	log.Printf("[Worker Init] Configuration: RedisAddr=%s, Concurrency=%d, MockModeWhatsApp=%t, MockModeEmail=%t", 
		config.RedisAddr, config.WorkerCount, config.MockWhatsApp, config.MockEmail)

	// Initialize Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     config.RedisAddr,
		Password: config.RedisPassword,
		DB:       config.RedisDB,
	})

	// Test Connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("[Critical] Unable to connect to Redis: %v", err)
	}
	log.Println("[Worker Init] Connection to Redis verified successfully.")

	// Context for graceful shutdown
	runCtx, stopWorkers := context.WithCancel(context.Background())
	
	// Track Goroutines via WaitGroup
	var wg sync.WaitGroup

	// Boot Worker Pool
	for i := 1; i <= config.WorkerCount; i++ {
		wg.Add(1)
		go worker(runCtx, &wg, i, rdb, config)
	}

	// Capture Shutdown Signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	sig := <-sigChan
	log.Printf("[Worker Shutdown] Received signal: %v. Initiating graceful shutdown...", sig)
	
	// Terminate worker loops
	stopWorkers()
	
	// Wait for processing goroutines to empty current tasks
	log.Println("[Worker Shutdown] Waiting for active worker threads to finish processing...")
	wg.Wait()
	
	// Close Redis
	rdb.Close()
	log.Println("[Worker Shutdown] Service stopped cleanly.")
}

func worker(ctx context.Context, wg *sync.WaitGroup, id int, rdb *redis.Client, cfg Config) {
	defer wg.Done()
	log.Printf("[Worker Thread #%d] Online and listening for tasks...", id)

	client := &http.Client{Timeout: 10 * time.Second}

	for {
		select {
		case <-ctx.Done():
			log.Printf("[Worker Thread #%d] Stopping thread...", id)
			return
		default:
			// Fetch from Redis Queue (using BRPOP with a 2-second timeout to allow loop cancellation check)
			result, err := rdb.BRPop(ctx, 2*time.Second, cfg.QueueName).Result()
			if err != nil {
				if err == redis.Nil {
					// Queue empty, continue polling
					continue
				}
				// Skip logging standard context deadline cancellation
				if ctx.Err() != nil {
					continue
				}
				log.Printf("[Worker Thread #%d] Redis BRPOP error: %v", id, err)
				time.Sleep(1 * time.Second) // Prevent tight crash loop
				continue
			}

			// BRPOP returns slice: [queueName, payload]
			if len(result) < 2 {
				continue
			}
			payload := result[1]

			var task QueueTask
			if err := json.Unmarshal([]byte(payload), &task); err != nil {
				log.Printf("[Worker Thread #%d] Failed to parse message JSON: %v. Raw: %s", id, err, payload)
				continue
			}

			log.Printf("[Worker Thread #%d] Received Task: Bill ID: %s, Customer: %s (%s)", 
				id, task.BillID, task.CustomerName, task.CustomerPhone)

			// --- ATOMIC LOCKING & IDEMPOTENCY STRATEGY ---
			// We construct a unique lock key for each bill
			lockKey := fmt.Sprintf("lock:bill:%s", task.BillID)
			
			// Try to acquire distributed lock using Redis SETNX (Set if Not Exists)
			// Expiration prevents orphan locks if worker crashes mid-task
			acquired, err := rdb.SetNX(ctx, lockKey, fmt.Sprintf("worker:%d", id), 30*time.Second).Result()
			if err != nil {
				log.Printf("[Worker Thread #%d] Error querying distributed lock: %v", id, err)
				continue
			}

			if !acquired {
				log.Printf("[Worker Thread #%d] WARNING: Duplicate task discarded. Bill %s already locked by another worker.", 
					id, task.BillID)
				continue
			}

			// Task processed under locked protection
			log.Printf("[Worker Thread #%d] Lock acquired for Bill ID %s. Commencing dispatch...", id, task.BillID)
			
			successWhatsApp := sendWhatsAppMessage(cfg, client, task)
			
			var successEmail bool
			if task.CustomerEmail != "" {
				successEmail = sendEmailMessage(cfg, task)
			} else {
				log.Printf("[Worker Thread #%d] No email provided for customer %s. Skipping email dispatch.", id, task.CustomerName)
				successEmail = true
			}
			
			success := successWhatsApp && successEmail
			
			// Release distributed lock so the bill can be processed again if re-queued
			rdb.Del(ctx, lockKey)
			
			// Optional: Notify backend service of completion to update DB
			// In production, updating DB state ensures real-time statuses in MERN dashboard
			log.Printf("[Worker Thread #%d] Completed processing for invoice %s. Success = %t", id, task.InvoiceNumber, success)
		}
	}
}

// Formats receipt layout & executes WhatsApp API
func sendWhatsAppMessage(cfg Config, client *http.Client, task QueueTask) bool {
	// 1. Format Beautiful UTF receipt summary
	messageText := fmt.Sprintf(
		"🧾 *INVOICE: %s*\n"+
		"🏢 *DS Dryfruits Premium Dryfruits Store*\n"+
		"----------------------------------------\n"+
		"Dear *%s*,\n\n"+
		"Thank you for shopping with us! Here is a summary of your bill:\n\n"+
		"📦 *Items Purchased*:\n%s\n\n"+
		"💵 *Total Amount Paid*: *₹%.2f*\n\n"+
		"----------------------------------------\n"+
		"If you have any queries, feel free to reply directly to this number.",
		task.InvoiceNumber,
		task.CustomerName,
		formatItems(task.ItemsSummary),
		task.Total,
	)

	// 2. Prepare HTTP Payload matching WhatsApp Cloud API Specification
	// (Using Custom Text Template message request format)
	// Sanitize phone number (Meta API expects digits only, e.g. 916376643123)
	toPhone := strings.TrimPrefix(task.CustomerPhone, "+")
	toPhone = strings.ReplaceAll(toPhone, " ", "")
	toPhone = strings.ReplaceAll(toPhone, "-", "")

	whatsappPayload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                toPhone,
		"type":              "text",
		"text": map[string]interface{}{
			"preview_url": false,
			"body":         messageText,
		},
	}

	payloadBytes, err := json.Marshal(whatsappPayload)
	if err != nil {
		log.Printf("[WhatsApp Handler] Marshalling JSON failed: %v", err)
		return false
	}

	if cfg.MockWhatsApp {
		// Log detailed receipt visualization to standard output
		log.Printf("\n--- [MOCK WHATSAPP DISPATCH] ---\n"+
			"To: %s\n"+
			"URL: %s/%s/messages\n"+
			"Authorization: Bearer [REDACTED]\n"+
			"Message Body:\n%s\n"+
			"--------------------------------",
			task.CustomerPhone, cfg.WhatsAppAPIURL, cfg.WhatsAppPhoneID, messageText)
		return true
	}

	// Make HTTP request to actual Meta endpoints
	url := fmt.Sprintf("%s/%s/messages", cfg.WhatsAppAPIURL, cfg.WhatsAppPhoneID)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("[WhatsApp Handler] Failed to create HTTP request: %v", err)
		return false
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.WhatsAppToken)

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[WhatsApp Handler] API Connection Error: %v", err)
		return false
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		log.Printf("[WhatsApp Handler] Meta API rejected request. Status: %d. Response: %s", 
			resp.StatusCode, string(respBody))
		return false
	}

	log.Printf("[WhatsApp Handler] Success: Invoice %s transmitted to Meta networks.", task.InvoiceNumber)
	return true
}

// Clean list delimiters to beautiful bold bulletins for WhatsApp formatting
func formatItems(summary string) string {
	items := strings.Split(summary, ", ")
	var formatted []string
	for _, item := range items {
		formatted = append(formatted, fmt.Sprintf("• %s", item))
	}
	return strings.Join(formatted, "\n")
}

// Formats HTML email receipt layout & executes SMTP transmission
func sendEmailMessage(cfg Config, task QueueTask) bool {
	subject := fmt.Sprintf("Invoice %s from DS Dryfruits Store", task.InvoiceNumber)
	
	// Format items into HTML table rows
	var itemsRows strings.Builder
	items := strings.Split(task.ItemsSummary, ", ")
	for _, item := range items {
		itemsRows.WriteString(fmt.Sprintf(`
			<tr>
				<td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155;">%s</td>
			</tr>`, item))
	}

	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DS Dryfruits Invoice</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%%, #14b8a6 100%%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <span style="font-size: 40px; margin-bottom: 8px; display: inline-block;">🧾</span>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; tracking-tight: -0.025em;">DS Dryfruits</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 500;">Premium Dryfruits Store</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #0f172a;">Invoice Summary</h2>
            <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; color: #475569; line-height: 1.5;">
                Dear <strong>%s</strong>,<br><br>
                Thank you for shopping with DS Dryfruits! Your order has been successfully processed. Here is your purchase receipt:
            </p>
            
            <!-- Metadata Grid -->
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <table style="width: 100%%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                        <td style="color: #64748b; padding-bottom: 8px; font-weight: 600;">Invoice Number:</td>
                        <td style="color: #334155; text-align: right; padding-bottom: 8px; font-weight: 700;">%s</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-weight: 600;">Date:</td>
                        <td style="color: #334155; text-align: right; font-weight: 500;">%s</td>
                    </tr>
                </table>
            </div>
            
            <!-- Items Table -->
            <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Items Purchased</h3>
            <table style="width: 100%%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Product Detail</th>
                    </tr>
                </thead>
                <tbody>
                    %s
                </tbody>
            </table>
            
            <!-- Total -->
            <div style="border-top: 2px dashed #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                <span style="font-size: 16px; font-weight: 700; color: #0f172a;">Total Paid:</span>
                <span style="font-size: 24px; font-weight: 800; color: #10b981;">₹%.2f</span>
            </div>
            
            <!-- Footer Callout -->
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                    If you have any questions or concerns regarding this receipt, please do not hesitate to contact us by replying to this email.
                </p>
                <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 600; color: #10b981;">
                    Thank you for your business!
                </p>
            </div>
        </div>
    </div>
</body>
</html>`,
		task.CustomerName,
		task.InvoiceNumber,
		time.Now().Format("Jan 02, 2006 15:04 MST"),
		itemsRows.String(),
		task.Total,
	)

	if cfg.MockEmail {
		// Log detailed receipt visualization to standard output
		log.Printf("\n--- [MOCK EMAIL DISPATCH] ---\n"+
			"To: %s\n"+
			"Subject: %s\n"+
			"From: %s\n"+
			"HTML Body Preview:\n%s\n"+
			"--------------------------------",
			task.CustomerEmail, subject, cfg.SMTPFromEmail, htmlBody)
		return true
	}

	// Build MIME message for HTML email
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	message := []byte(fmt.Sprintf("To: %s\nFrom: %s\nSubject: %s\n%s%s", 
		task.CustomerEmail, cfg.SMTPFromEmail, subject, mime, htmlBody))

	// Connect and send using SMTP
	auth := smtp.PlainAuth("", cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)

	// Since Go's smtp.SendMail handles STARTTLS automatically when port 587 is used
	err := smtp.SendMail(addr, auth, cfg.SMTPFromEmail, []string{task.CustomerEmail}, message)
	if err != nil {
		log.Printf("[Email Handler] Failed to send email using smtp.SendMail: %v", err)
		return false
	}

	log.Printf("[Email Handler] Success: Invoice %s transmitted to email SMTP gateway.", task.InvoiceNumber)
	return true
}
