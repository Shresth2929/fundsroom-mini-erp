import { Router } from 'express';
import * as authController from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, authController.getMe);

export default router;
