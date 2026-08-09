import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();

// All inventory routes require authentication
router.use(requireAuth);

// GET /api/inventory/movements  — All roles (read)
router.get(
  '/movements',
  requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  inventoryController.listMovements
);

// GET /api/inventory/low-stock  — All roles (read)
router.get(
  '/low-stock',
  requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  inventoryController.listLowStock
);

// POST /api/inventory/:productId/movement  — ADMIN, WAREHOUSE only (write)
router.post(
  '/:productId/movement',
  requireRole(Role.ADMIN, Role.WAREHOUSE),
  inventoryController.createMovement
);

export default router;
