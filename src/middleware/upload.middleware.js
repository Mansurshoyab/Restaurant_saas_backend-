import multer from 'multer';
import { env } from '../config/env.js';

// Memory storage — buffer goes straight to R2, never touches local disk.
// Fine for POS product/logo images which are small; for large future
// file types (e.g. bulk CSV imports) use a separate, bigger-limit config.
const storage = multer.memoryStorage();

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: env.R2_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});


