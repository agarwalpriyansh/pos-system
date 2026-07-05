package queue

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

func ConnectRedis(addr, password string, db int) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return rdb, nil
}

// PopQueueReliable atomically pops a task from queue and pushes it to processing queue
func PopQueueReliable(ctx context.Context, rdb *redis.Client, queueName string, timeout time.Duration) (string, error) {
	processingQueue := fmt.Sprintf("%s:processing", queueName)
	// BLMove source destination RIGHT LEFT timeout
	// Moves atomically from right of source queue (oldest) to left of processing queue
	return rdb.BLMove(ctx, queueName, processingQueue, "RIGHT", "LEFT", timeout).Result()
}

// RemoveProcessing removes task from processing queue after successful execution
func RemoveProcessing(ctx context.Context, rdb *redis.Client, queueName, payload string) error {
	processingQueue := fmt.Sprintf("%s:processing", queueName)
	// LRem removes occurrences of value (count = 0 means remove all matching elements)
	return rdb.LRem(ctx, processingQueue, 0, payload).Err()
}

// PushQueue sends task back to main queue for retries
func PushQueue(ctx context.Context, rdb *redis.Client, queueName, payload string) error {
	return rdb.LPush(ctx, queueName, payload).Err()
}

// PushDLQ sends task to Dead Letter Queue list
func PushDLQ(ctx context.Context, rdb *redis.Client, queueName, payload string) error {
	dlqName := fmt.Sprintf("%s:dead", queueName)
	return rdb.LPush(ctx, dlqName, payload).Err()
}

// RecoverOrphans moves tasks from processing back to main queue on startup
func RecoverOrphans(rdb *redis.Client, queueName string) error {
	ctx := context.Background()
	processingQueue := fmt.Sprintf("%s:processing", queueName)

	for {
		// RPopLPush moves from processing queue back to main queue
		// (Wait with short timeout or direct non-blocking RPopLPush)
		val, err := rdb.RPopLPush(ctx, processingQueue, queueName).Result()
		if err != nil {
			if err == redis.Nil {
				break
			}
			return err
		}
		log.Printf("[Queue Recovery] Recovered stranded task payload back to queue: %s", val)
	}
	return nil
}
