import { Request, Response, NextFunction } from 'express';
import * as inventoryService from '../services/inventoryService';
import { stockMovementSchema } from '../validators/inventorySchema';
import { MovementType } from '@prisma/client';

export const createMovement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const validatedData = stockMovementSchema.parse(req.body);

    const result = await inventoryService.createStockMovement(
      productId,
      validatedData,
      req.user!.id
    );

    return res.status(201).json({
      success: true,
      message: 'Stock movement recorded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.query.productId as string | undefined;
    const movementType = req.query.movementType as MovementType | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await inventoryService.getStockMovements({ productId, movementType, page, limit });

    return res.status(200).json({
      success: true,
      message: 'Stock movements retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listLowStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await inventoryService.getLowStockProducts(page, limit);

    return res.status(200).json({
      success: true,
      message: 'Low stock products retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
