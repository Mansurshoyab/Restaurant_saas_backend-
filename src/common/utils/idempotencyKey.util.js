import { v4 as uuidv4 } from 'uuid';

export function generateIdempotencyKey() {
  return uuidv4();
}

export function idempotencyRedisKey(scope, key) {
  return `idem:${scope}:${key}`;
}

