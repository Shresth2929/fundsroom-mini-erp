import { z } from 'zod';

export const productCreateSchema = z.object({
  productName: z.string().trim().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().trim().min(3, 'SKU must be at least 3 characters'),
  category: z.string().trim().min(2, 'Category must be at least 2 characters'),
  unitPrice: z.number().nonnegative('Unit price must be greater than or equal to 0'),
  currentStock: z.number().int('Current stock must be an integer').nonnegative('Current stock cannot be negative').default(0),
  minStockAlertQty: z.number().int('Min stock alert must be an integer').nonnegative('Min stock alert cannot be negative').default(0),
  locationWarehouse: z.string().trim().min(2, 'Warehouse location must be at least 2 characters'),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
