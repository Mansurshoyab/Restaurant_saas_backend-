import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';

/**
 * Sends an SMS via BulkSMS BD. response_code 202 means accepted.
 */
const sendSms = async (phone, message) => {
  const smsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${env.BULKSMS_API_KEY}&number=${phone}&senderid=${env.BULKSMS_SENDER_ID}&message=${encodeURIComponent(message)}`;

  try {
    const smsResponse = await fetch(smsUrl);
    const smsResult = await smsResponse.json();

    if (smsResult.response_code !== 202) {
      logger.error({ smsResult }, 'SMS Gateway response error');
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ error }, 'SMS Gateway Error');
    return false;
  }
};

export { sendSms };


