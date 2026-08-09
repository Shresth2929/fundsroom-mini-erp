import { Router } from 'express';
import * as productController from '../controllers/productController';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();

// All product routes require authentication
router.use(requireAuth);

// GET /api/products  — All roles (read)
router.get('/', requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), productController.listProducts);

// GET /api/products/:id  — All roles (read)
router.get('/:id', requireRole(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), productController.getProduct);

// POST /api/products  — ADMIN, WAREHOUSE (create)
router.post('/', requireRole(Role.ADMIN, Role.WAREHOUSE), productController.createProduct);

// PUT /api/products/:id  — ADMIN, WAREHOUSE (update)
router.put('/:id', requireRole(Role.ADMIN, Role.WAREHOUSE), productController.updateProduct);

// DELETE /api/products/:id  — ADMIN only
router.delete('/:id', requireRole(Role.ADMIN), productController.deleteProduct);

export default router;
