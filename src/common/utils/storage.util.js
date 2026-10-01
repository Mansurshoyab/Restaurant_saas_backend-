import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { r2Client, R2_BUCKET } from '../../config/r2.js';
import { env } from '../../config/env.js';
import { ApiError } from './apiError.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/**
 * Builds a tenant-scoped, collision-proof object key.
 * e.g. orgs/64f.../products/8a2c1e-chicken-burger.webp
 */
function buildKey({ organizationId, folder, originalName }) {
  const ext = mime.extension(mime.lookup(originalName) || '') || 'bin';
  const safeName = uuidv4();
  return `orgs/${organizationId}/${folder}/${safeName}.${ext}`;
}

/**
 * Uploads a buffer (from multer memoryStorage) to R2.
 * folder examples: 'products', 'receipts', 'logos', 'suppliers'
 */
export async function uploadToR2({ organizationId, folder, file }) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw ApiError.badRequest(`Unsupported file type: ${file.mimetype}`);
  }

  const maxBytes = env.R2_MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw ApiError.badRequest(`File exceeds maximum size of ${env.R2_MAX_FILE_SIZE_MB}MB`);
  }

  const key = buildKey({ organizationId, folder, originalName: file.originalname });

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return {
    key,
    url: `${env.R2_PUBLIC_BASE_URL}/${key}`,
  };
}

export async function deleteFromR2(key) {
  if (!key) return;
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

/**
 * Only needed if the bucket is private and you serve via signed URLs
 * instead of a public R2.dev / custom domain. Skip this if
 * R2_PUBLIC_BASE_URL already serves the bucket publicly.
 */
export async function getSignedReadUrl(key, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

