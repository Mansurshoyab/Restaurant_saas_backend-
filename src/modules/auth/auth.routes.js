import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  registerOwnerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  changePasswordSchema,
} from './auth.validation.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerOwnerSchema }),
  authController.register
);

// Accepts email OR phone + password
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);

// OTP path — use for password recovery or passwordless staff, not as the
// default login (each request costs an SMS)
router.post(
  '/otp/request',
  authRateLimiter,
  validate({ body: requestOtpSchema }),
  authController.requestOtp
);
router.post(
  '/otp/verify',
  authRateLimiter,
  validate({ body: verifyOtpSchema }),
  authController.verifyOtp
);

router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);
router.post('/logout', authenticate, validate({ body: refreshSchema }), authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

router.get('/me', authenticate, authController.me);

export default router;


