import { z } from 'zod';
import { CustomerType, CustomerStatus } from '@prisma/client';

export const customerCreateSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters'),
  mobileNumber: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid mobile number format (must be E.164 or 10-15 digits)'),
  email: z.string().trim().email('Invalid email address format'),
  businessName: z.string().trim().min(2, 'Business name must be at least 2 characters'),
  gstNumber: z.string().trim().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format (e.g., 07AAAAA1111A1Z1)').optional().nullable().or(z.literal('')),
  customerType: z.nativeEnum(CustomerType, {
    errorMap: () => ({ message: 'Invalid customer type. Must be RETAIL, WHOLESALE, or DISTRIBUTOR' }),
  }),
  address: z.string().trim().min(5, 'Address must be at least 5 characters'),
  status: z.nativeEnum(CustomerStatus, {
    errorMap: () => ({ message: 'Invalid customer status. Must be LEAD, ACTIVE, or INACTIVE' }),
  }).default(CustomerStatus.ACTIVE),
  followUpDate: z.string().datetime({ message: 'Invalid ISO datetime string' }).optional().nullable().or(z.literal('')),
  notes: z.string().trim().optional().nullable().or(z.literal('')),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
