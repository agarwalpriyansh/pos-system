package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"pos-whatsapp-worker/config"
	"pos-whatsapp-worker/queue"
	"pos-whatsapp-worker/types"
)

func StartWorker(ctx context.Context, wg *sync.WaitGroup, id int, rdb *redis.Client, cfg config.Config, notifiers []Notifier) {
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
			
			// Polymorphic Send over all registered Notifiers (OCP / DIP compliance)
			var successWhatsApp bool
			var successEmail bool
			hasEmail := task.CustomerEmail != ""

			for _, notifier := range notifiers {
				success := notifier.Send(ctx, task)
				if notifier.Name() == "WhatsApp" {
					successWhatsApp = success
				} else if notifier.Name() == "Email" {
					successEmail = success
				}
			}

			// Release distributed lock
			queue.ReleaseLock(ctx, rdb, lockKey)
			
			// Notify backend service of completion to update DB
			updateBillStatus(cfg, client, task.BillID, successWhatsApp, hasEmail, successEmail)
			
			log.Printf("[Worker Thread #%d] Completed processing for invoice %s.", id, task.InvoiceNumber)
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
