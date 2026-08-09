import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customerService';
import { customerCreateSchema, customerUpdateSchema } from '../validators/customerSchema';
import { NotFoundError } from '../utils/errors';
import { CustomerType, CustomerStatus } from '@prisma/client';

export const listCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const type = req.query.type as CustomerType | undefined;
    const status = req.query.status as CustomerStatus | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await customerService.getCustomers({ search, type, status, page, limit });

    return res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);
    
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Customer retrieved successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = customerCreateSchema.parse(req.body);
    const customer = await customerService.createCustomer(validatedData);

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const customerExists = await customerService.getCustomerById(id);
    if (!customerExists) {
      throw new NotFoundError('Customer not found');
    }

    const validatedData = customerUpdateSchema.parse(req.body);
    const customer = await customerService.updateCustomer(id, validatedData);

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const customerExists = await customerService.getCustomerById(id);
    if (!customerExists) {
      throw new NotFoundError('Customer not found');
    }

    await customerService.deleteCustomer(id);

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
