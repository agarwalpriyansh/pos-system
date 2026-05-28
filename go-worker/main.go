package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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
}

// QueueTask represents the structural schema pushed by Node.js
type QueueTask struct {
	BillID        string  `json:"billId"`
	InvoiceNumber string  `json:"invoiceNumber"`
	CustomerPhone string  `json:"customerPhone"`
	CustomerName  string  `json:"customerName"`
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

	mockWhatsApp := getEnv("MOCK_WHATSAPP_API", "true") == "true"

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
	log.Printf("[Worker Init] Starting POS WhatsApp service worker...")
	log.Printf("[Worker Init] Configuration: RedisAddr=%s, Concurrency=%d, MockMode=%t", 
		config.RedisAddr, config.WorkerCount, config.MockWhatsApp)

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
			
			success := sendWhatsAppMessage(cfg, client, task)
			
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
		"🏢 *ds dryfruits premium dry fruits store*\n"+
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
	whatsappPayload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                task.CustomerPhone,
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
