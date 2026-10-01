import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

// R2 speaks the S3 API — region is arbitrary but required by the SDK,
// and path-style addressing is required (R2 doesn't support virtual-hosted).
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export const R2_BUCKET = env.R2_BUCKET_NAME;

