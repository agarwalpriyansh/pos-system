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

const MaxRetries = 3

func StartWorker(ctx context.Context, wg *sync.WaitGroup, id int, rdb *redis.Client, cfg config.Config, notifiers []Notifier) {
	defer wg.Done()
	log.Printf("[Worker Thread #%d] Online and listening for tasks...", id)

	client := &http.Client{Timeout: 10 * time.Second}

	for {
		select {
		case <-ctx.Done():
			log.Printf("[Worker Thread #%d] Shutdown signal received. Stopping thread...", id)
			return
		default:
			// Fetch from Redis Queue reliably (using BLMove to shift popped item to processing list)
			payload, err := queue.PopQueueReliable(ctx, rdb, cfg.QueueName, 2*time.Second)
			if err != nil {
				if err == redis.Nil {
					// Queue empty, continue polling
					continue
				}
				// Skip logging standard context deadline cancellation
				if ctx.Err() != nil {
					continue
				}
				log.Printf("[Worker Thread #%d] Redis BLMove error: %v", id, err)
				time.Sleep(1 * time.Second) // Prevent tight crash loop
				continue
			}

			// Delegate work to a separate function containing panic recovery to protect the polling loop
			processTaskWithRecovery(ctx, id, rdb, cfg, payload, notifiers, client)
		}
	}
}

func processTaskWithRecovery(ctx context.Context, id int, rdb *redis.Client, cfg config.Config, payload string, notifiers []Notifier, client *http.Client) {
	// Panic recovery block to ensure worker thread does not crash the program
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Worker Thread #%d CRITICAL PANIC] Recovered from panic during task processing. Error: %v. Payload: %s", id, r, payload)
			// Clean up processing list to avoid stalling the item indefinitely
			queue.RemoveProcessing(context.Background(), rdb, cfg.QueueName, payload)
		}
	}()

	var task types.QueueTask
	if err := json.Unmarshal([]byte(payload), &task); err != nil {
		log.Printf("[Worker Thread #%d] Failed to parse message JSON: %v. Raw: %s", id, err, payload)
		queue.RemoveProcessing(ctx, rdb, cfg.QueueName, payload) // discard corrupt payload
		return
	}

	log.Printf("[Worker Thread #%d] Processing task for Invoice: %s, Customer: %s, Retry Attempt: %d", 
		id, task.InvoiceNumber, task.CustomerName, task.RetryCount)

	// --- ATOMIC LOCKING & IDEMPOTENCY STRATEGY ---
	lockKey := fmt.Sprintf("lock:bill:%s", task.BillID)
	
	acquired, err := queue.AcquireLock(ctx, rdb, lockKey, fmt.Sprintf("worker:%d", id), 30*time.Second)
	if err != nil {
		log.Printf("[Worker Thread #%d] Error querying distributed lock: %v", id, err)
		return
	}

	if !acquired {
		log.Printf("[Worker Thread #%d] WARNING: Duplicate task discarded. Bill %s already locked by another worker.", 
			id, task.BillID)
		queue.RemoveProcessing(ctx, rdb, cfg.QueueName, payload) // clean processing list
		return
	}

	// Task processed under locked protection
	log.Printf("[Worker Thread #%d] Lock acquired for Bill ID %s. Commencing dispatch...", id, task.BillID)
	
	// Polymorphic Send over all registered Notifiers
	var successWhatsApp bool
	var successEmail bool
	hasEmail := task.CustomerEmail != ""

	for _, notifier := range notifiers {
		// Ensure context is not cancelled before notifying
		if err := ctx.Err(); err != nil {
			log.Printf("[Worker Thread #%d] Context cancelled. Aborting notification send.", id)
			queue.ReleaseLock(context.Background(), rdb, lockKey)
			return
		}

		success := notifier.Send(ctx, task)
		if notifier.Name() == "WhatsApp" {
			successWhatsApp = success
		} else if notifier.Name() == "Email" {
			successEmail = success
		}
	}

	// Release distributed lock
	queue.ReleaseLock(ctx, rdb, lockKey)

	allSuccess := successWhatsApp && (successEmail || !hasEmail)

	if allSuccess {
		// Remove from processing queue on success
		queue.RemoveProcessing(ctx, rdb, cfg.QueueName, payload)
		updateBillStatus(ctx, cfg, client, task.BillID, successWhatsApp, hasEmail, successEmail)
		log.Printf("[Worker Thread #%d] Successfully completed processing for invoice %s.", id, task.InvoiceNumber)
	} else {
		// Increment retry count
		task.RetryCount++
		
		// Remove old payload from processing queue
		queue.RemoveProcessing(ctx, rdb, cfg.QueueName, payload)

		updatedPayloadBytes, _ := json.Marshal(task)
		updatedPayload := string(updatedPayloadBytes)

		if task.RetryCount <= MaxRetries {
			// Calculate exponential backoff duration (2^RetryCount * 2s) => 4s, 8s, 16s
			backoffDur := time.Duration(1<<task.RetryCount) * 2 * time.Second
			log.Printf("[Worker Thread #%d] Task failed. Re-enqueueing in %v. Attempt %d/%d", 
				id, backoffDur, task.RetryCount, MaxRetries)
			
			go func(backoff time.Duration, p string) {
				time.Sleep(backoff)
				err := queue.PushQueue(context.Background(), rdb, cfg.QueueName, p)
				if err != nil {
					log.Printf("[Backoff Router] Failed to re-enqueue task: %v", err)
				}
			}(backoffDur, updatedPayload)

		} else {
			log.Printf("[Worker Thread #%d] CRITICAL: Task exceeded max retries. Moving to Dead Letter Queue (DLQ).", id)
			queue.PushDLQ(ctx, rdb, cfg.QueueName, updatedPayload)
			updateBillStatus(ctx, cfg, client, task.BillID, successWhatsApp, hasEmail, successEmail)
		}
	}
}

// Notify backend of final delivery status of WhatsApp and Email
func updateBillStatus(ctx context.Context, cfg config.Config, client *http.Client, billID string, successWhatsApp bool, hasEmail bool, successEmail bool) {
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
	req, err := http.NewRequestWithContext(ctx, "PATCH", url, bytes.NewBuffer(payloadBytes))
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
