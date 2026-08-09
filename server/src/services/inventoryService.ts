import prisma from '../lib/prisma';
import { MovementType } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';

interface StockMovementData {
  quantity: number;
  movementType: MovementType;
  reason: string;
}

export const createStockMovement = async (
  productId: string,
  data: StockMovementData,
  userId: string
) => {
  const { quantity, movementType, reason } = data;

  // Run as an atomic database transaction
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current product stock
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    let newStock = product.currentStock;

    if (movementType === MovementType.IN) {
      newStock += quantity;
    } else if (movementType === MovementType.OUT) {
      if (product.currentStock < quantity) {
        throw new BadRequestError(
          `Insufficient stock. Available: ${product.currentStock}, Requested: ${quantity}.`
        );
      }
      newStock -= quantity;
    }

    // 2. Update product stock level
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    // 3. Create stock movement record
    const movement = await tx.stockMovement.create({
      data: {
        productId,
        quantity,
        movementType,
        reason,
        createdById: userId,
      },
      include: {
        product: { select: { productName: true, sku: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });

    return {
      product: updatedProduct,
      movement,
    };
  });
};

interface GetMovementsParams {
  productId?: string;
  movementType?: MovementType;
  page?: number;
  limit?: number;
}

export const getStockMovements = async (params: GetMovementsParams) => {
  const { productId, movementType, page = 1, limit = 10 } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (productId) {
    where.productId = productId;
  }
  if (movementType) {
    where.movementType = movementType;
  }

  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { productName: true, sku: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    movements,
  };
};

export const getLowStockProducts = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  // Prisma query where currentStock <= minimumStock (minStockAlertQty)
  const where = {
    currentStock: {
      lte: prisma.product.fields.minimumStock,
    },
  };

  // Note: Prisma does not easily allow column comparison directly in findMany filter
  // without raw queries or using the prisma.product.fields helper if supported, or pulling and filtering.
  // Wait! In PostgreSQL, comparing two columns is simple using raw SQL or by querying all or using $queryRaw.
  // Wait, is there a way to do column comparison in Prisma?
  // No, Prisma findMany does not support column-to-column comparisons (e.g. currentStock <= minimumStock) out of the box in the `where` filter.
  // To keep it standard and database-agnostic, we can write a raw query using `prisma.$queryRaw`:
  // SELECT * FROM products WHERE "currentStock" <= "minimumStock" ORDER BY "createdAt" DESC LIMIT limit OFFSET skip;
  // Let's write the query using `$queryRaw` to select the products accurately!
  // That is extremely professional, safe, and works perfectly on PostgreSQL (Supabase)!
  
  // Wait, let's look at the database table map. In schema.prisma we wrote:
  // @@map("products")
  // So the table name is `products` and columns are:
  // "id", "productName", "sku", "category", "unitPrice", "currentStock", "minimumStock", "location", "createdAt", "updatedAt"
  
  // Let's write the queries using queryRaw for count and select:
  const offset = skip;
  const products: any[] = await prisma.$queryRaw`
    SELECT id, "productName", sku, category, "unitPrice", "currentStock", "minimumStock", location, "createdAt", "updatedAt"
    FROM products
    WHERE "currentStock" <= "minimumStock"
    ORDER BY "createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const countResult: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count
    FROM products
    WHERE "currentStock" <= "minimumStock"
  `;
  const total = countResult[0]?.count || 0;

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    products,
  };
};
