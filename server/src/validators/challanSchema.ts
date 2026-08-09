import { z } from 'zod';
import { ChallanStatus } from '@prisma/client';

export const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than 0'),
});

export const challanCreateSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID format'),
  status: z.nativeEnum(ChallanStatus, {
    errorMap: () => ({ message: 'Invalid challan status. Must be DRAFT, CONFIRMED, or CANCELLED' }),
  }).default(ChallanStatus.DRAFT),
  items: z.array(challanItemSchema).min(1, 'At least one item is required in the challan'),
});

export const challanUpdateSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID format').optional(),
  status: z.nativeEnum(ChallanStatus, {
    errorMap: () => ({ message: 'Invalid challan status. Must be DRAFT, CONFIRMED, or CANCELLED' }),
  }).optional(),
  items: z.array(challanItemSchema).min(1, 'At least one item is required in the challan').optional(),
});

export type ChallanCreateInput = z.infer<typeof challanCreateSchema>;
export type ChallanUpdateInput = z.infer<typeof challanUpdateSchema>;
