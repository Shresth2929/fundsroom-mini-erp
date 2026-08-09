import { z } from 'zod';
import { MovementType } from '@prisma/client';

export const stockMovementSchema = z.object({
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than 0'),
  movementType: z.nativeEnum(MovementType, {
    errorMap: () => ({ message: 'Invalid movement type. Must be IN or OUT' }),
  }),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters'),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;
