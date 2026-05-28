const Redis = require('ioredis');

let redisClient;

const getRedisClient = () => {
  if (!redisClient) {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = parseInt(process.env.REDIS_PORT, 10) || 6379;

    redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: null, // Critical parameter for queue workflows
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      console.log(`Redis Connected to ${host}:${port}`);
    });

    redisClient.on('error', (err) => {
      console.error('Redis Connection Error:', err.message);
    });
  }

  return redisClient;
};

module.exports = { getRedisClient };
