import crypto from 'crypto';
import { redisClient } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../common/utils/apiError.js';
import { sendSms } from '../notifications/channels/sms.channel.js';

const OTP_KEY_PREFIX = 'otp:';
const MAX_ATTEMPTS = 5;

function otpKey(phone) {
  return `${OTP_KEY_PREFIX}${phone}`;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  const max = 10 ** env.OTP_LENGTH;
  return crypto.randomInt(0, max).toString().padStart(env.OTP_LENGTH, '0');
}

export async function requestOtp(phone) {
  const code = generateCode();
  const key = otpKey(phone);

  await redisClient.set(
    key,
    JSON.stringify({ hash: hashCode(code), attempts: 0 }),
    'EX',
    env.OTP_EXPIRES_IN_MIN * 60
  );

  const message = `Your verification code is ${code}. It expires in ${env.OTP_EXPIRES_IN_MIN} minutes.`;
  const sent = await sendSms(phone, message);

  if (!sent) {
    // Don't leave a live code sitting in Redis if delivery failed
    await redisClient.del(key);
    throw ApiError.internal('Failed to send OTP. Please try again shortly.');
  }

  return true;
}

export async function verifyOtp(phone, code) {
  const key = otpKey(phone);
  const raw = await redisClient.get(key);

  if (!raw) {
    throw ApiError.badRequest('OTP expired or not requested. Please request a new code.');
  }

  const record = JSON.parse(raw);

  if (record.attempts >= MAX_ATTEMPTS) {
    await redisClient.del(key);
    throw ApiError.badRequest('Too many incorrect attempts. Please request a new code.');
  }

  if (record.hash !== hashCode(code)) {
    record.attempts += 1;
    await redisClient.set(key, JSON.stringify(record), 'KEEPTTL');
    throw ApiError.badRequest('Incorrect OTP code');
  }

  await redisClient.del(key);
  return true;
}


