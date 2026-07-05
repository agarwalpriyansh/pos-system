package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

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
			
			// Notify backend service of completion to update DB
			updateBillStatus(cfg, client, task.BillID, successWhatsApp, task.CustomerEmail != "", successEmail)
			
			log.Printf("[Worker Thread #%d] Completed processing for invoice %s. Success = %t", id, task.InvoiceNumber, success)
		}
	}
}
