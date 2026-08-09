import { Router } from 'express';
import * as customerController from '../controllers/customerController';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();

// All customer routes require authentication
router.use(requireAuth);

// GET /api/customers  — ADMIN, SALES, ACCOUNTS (read)
router.get('/', requireRole(Role.ADMIN, Role.SALES, Role.ACCOUNTS), customerController.listCustomers);

// GET /api/customers/:id  — ADMIN, SALES, ACCOUNTS (read)
router.get('/:id', requireRole(Role.ADMIN, Role.SALES, Role.ACCOUNTS), customerController.getCustomer);

// POST /api/customers  — ADMIN, SALES (create)
router.post('/', requireRole(Role.ADMIN, Role.SALES), customerController.createCustomer);

// PUT /api/customers/:id  — ADMIN, SALES (update)
router.put('/:id', requireRole(Role.ADMIN, Role.SALES), customerController.updateCustomer);

// DELETE /api/customers/:id  — ADMIN only
router.delete('/:id', requireRole(Role.ADMIN), customerController.deleteCustomer);

export default router;
