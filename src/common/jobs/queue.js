import { Queue, Worker } from 'bullmq';
import { createRedisConnection } from '../../config/redis.js';
import { logger } from '../../config/logger.js';

const connection = createRedisConnection();

export function createQueue(name) {
  return new Queue(name, { connection });
}

export function createWorker(name, processor) {
  const worker = new Worker(name, processor, { connection });
  worker.on('failed', (job, err) =>
    logger.error({ err, jobId: job?.id, queue: name }, 'Job failed')
  );
  worker.on('completed', (job) => logger.debug({ jobId: job.id, queue: name }, 'Job completed'));
  return worker;
}

