import { Router } from 'express';
import * as challanController from '../controllers/challanController';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();

// All challan routes require authentication
router.use(requireAuth);

// GET /api/challans — ADMIN, SALES, WAREHOUSE, ACCOUNTS (read)
router.get(
  '/',
  requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  challanController.listChallans
);

// GET /api/challans/:id — ADMIN, SALES, WAREHOUSE, ACCOUNTS (read)
router.get(
  '/:id',
  requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  challanController.getChallan
);

// POST /api/challans — ADMIN, SALES (create)
router.post(
  '/',
  requireRole(Role.ADMIN, Role.SALES),
  challanController.createChallan
);

// PUT /api/challans/:id — ADMIN, SALES (update/cancel)
router.put(
  '/:id',
  requireRole(Role.ADMIN, Role.SALES),
  challanController.updateChallan
);

// DELETE /api/challans/:id — ADMIN only (delete)
router.delete(
  '/:id',
  requireRole(Role.ADMIN),
  challanController.deleteChallan
);

export default router;
