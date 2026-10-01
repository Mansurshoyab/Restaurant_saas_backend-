import { redisClient, createRedisConnection } from '../../config/redis.js';
import { logger } from '../../config/logger.js';

const CHANNEL_PREFIX = 'events:';
const subscriber = createRedisConnection();
const listeners = new Map();

export async function publish(eventType, payload) {
  try {
    await redisClient.publish(CHANNEL_PREFIX + eventType, JSON.stringify(payload));
  } catch (err) {
    logger.error({ err, eventType }, 'Failed to publish event');
  }
}

export function subscribe(eventType, handler) {
  const channel = CHANNEL_PREFIX + eventType;

  if (!listeners.has(channel)) {
    listeners.set(channel, []);
    subscriber.subscribe(channel);
  }
  listeners.get(channel).push(handler);
}

subscriber.on('message', (channel, message) => {
  const handlers = listeners.get(channel);
  if (!handlers) return;

  let payload;
  try {
    payload = JSON.parse(message);
  } catch (err) {
    logger.error({ err, channel }, 'Failed to parse event payload');
    return;
  }

  handlers.forEach((handler) => {
    Promise.resolve(handler(payload)).catch((err) =>
      logger.error({ err, channel }, 'Event handler failed')
    );
  });
});

