import prisma from '../lib/prisma';

interface GetProductsParams {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export const getProducts = async (params: GetProductsParams) => {
  const { search, category, page = 1, limit = 10 } = params;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { productName: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category) {
    where.category = { contains: category, mode: 'insensitive' };
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    products,
  };
};

export const getProductById = async (id: string) => {
  return await prisma.product.findUnique({
    where: { id },
  });
};

export const getProductBySku = async (sku: string) => {
  return await prisma.product.findUnique({
    where: { sku: sku.toUpperCase() },
  });
};

export const createProduct = async (data: any) => {
  return await prisma.product.create({
    data: {
      productName: data.productName,
      sku: data.sku.toUpperCase(),
      category: data.category,
      unitPrice: data.unitPrice,
      currentStock: data.currentStock ?? 0,
      minimumStock: data.minStockAlertQty ?? 0, // Map minStockAlertQty to minimumStock
      location: data.locationWarehouse, // Map locationWarehouse to location
    },
  });
};

export const updateProduct = async (id: string, data: any) => {
  const updateData: any = {};

  if (data.productName !== undefined) updateData.productName = data.productName;
  if (data.sku !== undefined) updateData.sku = data.sku.toUpperCase();
  if (data.category !== undefined) updateData.category = data.category;
  if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
  if (data.currentStock !== undefined) updateData.currentStock = data.currentStock;
  if (data.minStockAlertQty !== undefined) updateData.minimumStock = data.minStockAlertQty;
  if (data.locationWarehouse !== undefined) updateData.location = data.locationWarehouse;

  return await prisma.product.update({
    where: { id },
    data: updateData,
  });
};

export const deleteProduct = async (id: string) => {
  return await prisma.product.delete({
    where: { id },
  });
};
