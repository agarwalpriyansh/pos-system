package queue

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

func AcquireLock(ctx context.Context, rdb *redis.Client, key, value string, expiration time.Duration) (bool, error) {
	return rdb.SetNX(ctx, key, value, expiration).Result()
}

func ReleaseLock(ctx context.Context, rdb *redis.Client, key string) error {
	return rdb.Del(ctx, key).Err()
}
