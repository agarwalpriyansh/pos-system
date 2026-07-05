package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"pos-whatsapp-worker/config"
	"pos-whatsapp-worker/queue"
	"pos-whatsapp-worker/workers"
)

func main() {
	cfg := config.LoadConfig()
	log.Printf("[Worker Init] Starting POS WhatsApp/Email service worker...")
	log.Printf("[Worker Init] Configuration: RedisAddr=%s, Concurrency=%d, MockModeWhatsApp=%t, MockModeEmail=%t", 
		cfg.RedisAddr, cfg.WorkerCount, cfg.MockWhatsApp, cfg.MockEmail)

	// Initialize Redis
	rdb, err := queue.ConnectRedis(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Fatalf("[Critical] Unable to connect to Redis: %v", err)
	}
	log.Println("[Worker Init] Connection to Redis verified successfully.")

	// Context for graceful shutdown
	runCtx, stopWorkers := context.WithCancel(context.Background())
	
	// Track Goroutines via WaitGroup
	var wg sync.WaitGroup

	// Boot Worker Pool
	for i := 1; i <= cfg.WorkerCount; i++ {
		wg.Add(1)
		go workers.StartWorker(runCtx, &wg, i, rdb, cfg)
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
