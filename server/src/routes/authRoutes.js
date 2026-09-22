import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  login, loginSchema, me, changePassword, changePasswordSchema,
} from '../controllers/authController.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);
router.post('/change-password', requireAuth, validate(changePasswordSchema), changePassword);

export default router;
