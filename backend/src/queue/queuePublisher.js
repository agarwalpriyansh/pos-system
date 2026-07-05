const { getRedisClient } = require('../config/redis');

const publishBillTask = async (taskPayload) => {
  const redis = getRedisClient();
  const queueName = process.env.REDIS_QUEUE_NAME || 'queue:bills';
  await redis.lpush(queueName, JSON.stringify(taskPayload));
  console.log(`[Queue Publisher] Successfully queued task for invoice ${taskPayload.invoiceNumber}`);
};

module.exports = {
  publishBillTask
};
