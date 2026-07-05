package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/smtp"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"pos-whatsapp-worker/config"
	"pos-whatsapp-worker/queue"
	"pos-whatsapp-worker/templates"
	"pos-whatsapp-worker/types"
)

func StartWorker(ctx context.Context, wg *sync.WaitGroup, id int, rdb *redis.Client, cfg config.Config) {
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
			result, err := queue.PopQueue(ctx, rdb, cfg.QueueName, 2*time.Second)
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

			var task types.QueueTask
			if err := json.Unmarshal([]byte(payload), &task); err != nil {
				log.Printf("[Worker Thread #%d] Failed to parse message JSON: %v. Raw: %s", id, err, payload)
				continue
			}

			log.Printf("[Worker Thread #%d] Received Task: Bill ID: %s, Customer: %s (%s)", 
				id, task.BillID, task.CustomerName, task.CustomerPhone)

			// --- ATOMIC LOCKING & IDEMPOTENCY STRATEGY ---
			lockKey := fmt.Sprintf("lock:bill:%s", task.BillID)
			
			acquired, err := queue.AcquireLock(ctx, rdb, lockKey, fmt.Sprintf("worker:%d", id), 30*time.Second)
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
			
			// Release distributed lock
			queue.ReleaseLock(ctx, rdb, lockKey)
			
			// Notify backend service of completion to update DB
			updateBillStatus(cfg, client, task.BillID, successWhatsApp, task.CustomerEmail != "", successEmail)
			
			log.Printf("[Worker Thread #%d] Completed processing for invoice %s. Success = %t", id, task.InvoiceNumber, success)
		}
	}
}

// Notify backend of final delivery status of WhatsApp and Email
func updateBillStatus(cfg config.Config, client *http.Client, billID string, successWhatsApp bool, hasEmail bool, successEmail bool) {
	statusPayload := map[string]string{}
	
	if successWhatsApp {
		statusPayload["whatsappStatus"] = "Sent"
	} else {
		statusPayload["whatsappStatus"] = "Failed"
	}

	if hasEmail {
		if successEmail {
			statusPayload["emailStatus"] = "Sent"
		} else {
			statusPayload["emailStatus"] = "Failed"
		}
	}

	payloadBytes, err := json.Marshal(statusPayload)
	if err != nil {
		log.Printf("[Status Updater] Failed to marshal status payload: %v", err)
		return
	}

	url := fmt.Sprintf("%s/api/bills/%s/status", cfg.BackendURL, billID)
	req, err := http.NewRequest("PATCH", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("[Status Updater] Failed to create PATCH request: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Status Updater] Failed to execute PATCH request: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[Status Updater] Backend rejected status update. Status: %d. Response: %s", resp.StatusCode, string(respBody))
		return
	}

	log.Printf("[Status Updater] Successfully updated DB status for Bill ID %s in backend.", billID)
}

// executes WhatsApp API
func sendWhatsAppMessage(cfg config.Config, client *http.Client, task types.QueueTask) bool {
	messageText := templates.BuildWhatsAppMessage(task)

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
		log.Printf("\n--- [MOCK WHATSAPP DISPATCH] ---\n"+
			"To: %s\n"+
			"URL: %s/%s/messages\n"+
			"Authorization: Bearer [REDACTED]\n"+
			"Message Body:\n%s\n"+
			"--------------------------------",
			task.CustomerPhone, cfg.WhatsAppAPIURL, cfg.WhatsAppPhoneID, messageText)
		return true
	}

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

// executes SMTP transmission
func sendEmailMessage(cfg config.Config, task types.QueueTask) bool {
	shopName := task.ShopName
	if shopName == "" {
		shopName = "DS DRYFRUITS"
	}

	subject := fmt.Sprintf("Invoice %s from %s", task.InvoiceNumber, shopName)
	fromHeader := fmt.Sprintf("\"%s\" <%s>", shopName, cfg.SMTPFromEmail)
	
	htmlBody := templates.BuildEmailHTML(task)

	if cfg.MockEmail {
		log.Printf("\n--- [MOCK EMAIL DISPATCH] ---\n"+
			"To: %s\n"+
			"Subject: %s\n"+
			"From: %s\n"+
			"HTML Body Preview:\n%s\n"+
			"--------------------------------",
			task.CustomerEmail, subject, fromHeader, htmlBody)
		return true
	}

	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	message := []byte(fmt.Sprintf("To: %s\nFrom: %s\nSubject: %s\n%s%s", 
		task.CustomerEmail, fromHeader, subject, mime, htmlBody))

	auth := smtp.PlainAuth("", cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)

	err := smtp.SendMail(addr, auth, cfg.SMTPFromEmail, []string{task.CustomerEmail}, message)
	if err != nil {
		log.Printf("[Email Handler] Failed to send email using smtp.SendMail: %v", err)
		return false
	}

	log.Printf("[Email Handler] Success: Invoice %s transmitted to email SMTP gateway.", task.InvoiceNumber)
	return true
}
