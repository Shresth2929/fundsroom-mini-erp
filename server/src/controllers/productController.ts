import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/productService';
import { productCreateSchema, productUpdateSchema } from '../validators/productSchema';
import { NotFoundError, ConflictError } from '../utils/errors';

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await productService.getProducts({ search, category, page, limit });

    return res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = productCreateSchema.parse(req.body);
    
    // Check for duplicate SKU
    const existingProduct = await productService.getProductBySku(validatedData.sku);
    if (existingProduct) {
      throw new ConflictError(`Product SKU '${validatedData.sku.toUpperCase()}' already exists`);
    }

    const product = await productService.createProduct(validatedData);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const productExists = await productService.getProductById(id);
    if (!productExists) {
      throw new NotFoundError('Product not found');
    }

    const validatedData = productUpdateSchema.parse(req.body);

    // If SKU is being updated, verify it is not a duplicate
    if (validatedData.sku && validatedData.sku.toUpperCase() !== productExists.sku) {
      const existingProduct = await productService.getProductBySku(validatedData.sku);
      if (existingProduct) {
        throw new ConflictError(`Product SKU '${validatedData.sku.toUpperCase()}' already exists`);
      }
    }

    const product = await productService.updateProduct(id, validatedData);

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const productExists = await productService.getProductById(id);
    if (!productExists) {
      throw new NotFoundError('Product not found');
    }

    await productService.deleteProduct(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
