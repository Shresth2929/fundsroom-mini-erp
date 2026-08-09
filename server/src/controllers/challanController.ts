import { Request, Response, NextFunction } from 'express';
import * as challanService from '../services/challanService';
import { challanCreateSchema, challanUpdateSchema } from '../validators/challanSchema';
import { NotFoundError } from '../utils/errors';
import { ChallanStatus } from '@prisma/client';

export const listChallans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = req.query.customerId as string | undefined;
    const status = req.query.status as ChallanStatus | undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await challanService.getChallans({ customerId, status, search, page, limit });

    return res.status(200).json({
      success: true,
      message: 'Challans retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const challan = await challanService.getChallanById(id);

    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Challan retrieved successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const createChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = challanCreateSchema.parse(req.body);
    const userId = req.user!.id;

    const challan = await challanService.createChallan(validatedData, userId);

    return res.status(201).json({
      success: true,
      message: 'Challan created successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const updateChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = challanUpdateSchema.parse(req.body);
    const userId = req.user!.id;

    const challan = await challanService.updateChallan(id, validatedData, userId);

    return res.status(200).json({
      success: true,
      message: 'Challan updated successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await challanService.deleteChallan(id);

    return res.status(200).json({
      success: true,
      message: 'Challan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
