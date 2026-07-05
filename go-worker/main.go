package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
)

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
