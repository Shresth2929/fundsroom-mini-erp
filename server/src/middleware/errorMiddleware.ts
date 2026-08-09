import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handle Prisma Unique constraint violation (P2002) as a ConflictError (409)
  if ((err as any).code === 'P2002') {
    const targetFields = (err as any).meta?.target || [];
    return res.status(409).json({
      success: false,
      message: `Conflict: Unique constraint failed on fields: ${targetFields.join(', ')}`,
    });
  }

  // Handle Prisma Record Not Found (P2025)
  if ((err as any).code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
    });
  }

  // Log unexpected errors internally
  console.error('[Unhandled Error]:', err);

  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
};
