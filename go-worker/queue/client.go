package queue

import (
	"context"
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

func PopQueue(ctx context.Context, rdb *redis.Client, queueName string, timeout time.Duration) ([]string, error) {
	return rdb.BRPop(ctx, timeout, queueName).Result()
}
