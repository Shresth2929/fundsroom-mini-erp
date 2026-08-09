import prisma from '../lib/prisma';
import { ChallanStatus, MovementType } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { ChallanCreateInput, ChallanUpdateInput } from '../validators/challanSchema';

interface GetChallansParams {
  customerId?: string;
  status?: ChallanStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// Generate unique sequential challan number CH-YYYYMMDD-XXX
export const generateChallanNumber = async (tx: any = prisma): Promise<string> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const count = await tx.challan.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const seq = String(count + 1).padStart(3, '0');

  return `CH-${year}${month}${day}-${seq}`;
};

export const createChallan = async (data: ChallanCreateInput, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify customer exists
    const customer = await tx.customer.findUnique({
      where: { id: data.customerId },
    });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const challanNumber = await generateChallanNumber(tx);
    let totalQuantity = 0;
    let totalPrice = 0;
    const itemsToCreate = [];

    // 2. Validate and snapshot products
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundError(`Product with ID ${item.productId} not found`);
      }

      // If confirming, check stock availability
      if (data.status === ChallanStatus.CONFIRMED) {
        if (product.currentStock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for product '${product.productName}'. Available: ${product.currentStock}, Requested: ${item.quantity}.`
          );
        }

        // Deduct stock
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: item.quantity } },
        });

        // Log OUT stock movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: item.quantity,
            movementType: MovementType.OUT,
            reason: `Sales Challan ${challanNumber}`,
            createdById: userId,
          },
        });
      }

      const itemTotalPrice = item.quantity * product.unitPrice;
      totalQuantity += item.quantity;
      totalPrice += itemTotalPrice;

      itemsToCreate.push({
        productId: product.id,
        productNameSnapshot: product.productName,
        quantity: item.quantity,
        unitPriceSnapshot: product.unitPrice,
        totalPrice: itemTotalPrice,
      });
    }

    // 3. Create the Challan
    const challan = await tx.challan.create({
      data: {
        challanNumber,
        customerId: data.customerId,
        status: data.status ?? ChallanStatus.DRAFT,
        totalQuantity,
        totalPrice,
        createdById: userId,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { name: true, email: true } },
      },
    });

    return challan;
  });
};

export const getChallans = async (params: GetChallansParams) => {
  const { customerId, status, search, page = 1, limit = 10 } = params;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (customerId) {
    where.customerId = customerId;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { challanNumber: { contains: search, mode: 'insensitive' } },
      { customer: { customerName: { contains: search, mode: 'insensitive' } } },
      { customer: { businessName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, challans] = await Promise.all([
    prisma.challan.count({ where }),
    prisma.challan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { customerName: true, businessName: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    challans,
  };
};

export const getChallanById = async (id: string) => {
  return await prisma.challan.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: { select: { sku: true, category: true, location: true } },
        },
      },
      createdBy: { select: { name: true, email: true } },
    },
  });
};

export const updateChallan = async (id: string, data: ChallanUpdateInput, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch existing challan with items
    const challan = await tx.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    // Lock cancelled challans
    if (challan.status === ChallanStatus.CANCELLED) {
      throw new BadRequestError('Cannot modify a cancelled challan');
    }

    // 2. Handle state changes for CONFIRMED challans
    if (challan.status === ChallanStatus.CONFIRMED) {
      // Confirmed challans can ONLY transition to CANCELLED
      if (data.status === ChallanStatus.CANCELLED) {
        // Revert/return the stock for all items
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          // Log IN stock movement
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: MovementType.IN,
              reason: `Cancelled Challan ${challan.challanNumber}`,
              createdById: userId,
            },
          });
        }

        // Set status to CANCELLED
        return await tx.challan.update({
          where: { id },
          data: { status: ChallanStatus.CANCELLED },
          include: { customer: true, items: true },
        });
      } else if (data.customerId || data.items || (data.status && data.status !== ChallanStatus.CONFIRMED)) {
        throw new BadRequestError('Cannot modify confirmed challan details or items. You can only cancel the challan.');
      }

      // No changes requested
      return challan;
    }

    // 3. Handle state changes for DRAFT challans
    // We can update details, items, or transition status
    const targetStatus = data.status ?? challan.status;

    let updatedCustomerId = challan.customerId;
    if (data.customerId && data.customerId !== challan.customerId) {
      const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
      if (!customer) {
        throw new NotFoundError('Customer not found');
      }
      updatedCustomerId = data.customerId;
    }

    let itemsToProcess: any[] = challan.items;
    let itemsChanged = false;

    // If items are provided in the update payload
    if (data.items) {
      itemsChanged = true;
      // We will replace items. Delete old ones inside transaction.
      await tx.challanItem.deleteMany({ where: { challanId: id } });

      const newItems = [];
      for (const item of data.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundError(`Product with ID ${item.productId} not found`);
        }

        const itemTotalPrice = item.quantity * product.unitPrice;
        newItems.push({
          productId: product.id,
          productNameSnapshot: product.productName,
          quantity: item.quantity,
          unitPriceSnapshot: product.unitPrice,
          totalPrice: itemTotalPrice,
        });
      }
      itemsToProcess = newItems;
    }

    // Calculate totals
    const totalQuantity = itemsToProcess.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalPrice = itemsToProcess.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

    // If status transitions from DRAFT to CONFIRMED, perform stock checks and deduct
    if (challan.status === ChallanStatus.DRAFT && targetStatus === ChallanStatus.CONFIRMED) {
      for (const item of itemsToProcess) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundError(`Product with ID ${item.productId} not found`);
        }

        if (product.currentStock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for product '${product.productName}'. Available: ${product.currentStock}, Requested: ${item.quantity}.`
          );
        }

        // Deduct stock
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { decrement: item.quantity } },
        });

        // Log OUT stock movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: item.quantity,
            movementType: MovementType.OUT,
            reason: `Sales Challan ${challan.challanNumber}`,
            createdById: userId,
          },
        });
      }
    }

    // Recreate items if they changed
    if (itemsChanged) {
      await tx.challan.update({
        where: { id },
        data: {
          customerId: updatedCustomerId,
          status: targetStatus,
          totalQuantity,
          totalPrice,
          items: {
            create: itemsToProcess.map((item: any) => ({
              productId: item.productId,
              productNameSnapshot: item.productNameSnapshot,
              quantity: item.quantity,
              unitPriceSnapshot: item.unitPriceSnapshot,
              totalPrice: item.totalPrice,
            })),
          },
        },
      });
    } else {
      // Just update header info
      await tx.challan.update({
        where: { id },
        data: {
          customerId: updatedCustomerId,
          status: targetStatus,
          totalQuantity,
          totalPrice,
        },
      });
    }

    // Return the updated challan with fresh details
    return await tx.challan.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });
  });
};

export const deleteChallan = async (id: string) => {
  return await prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id } });
    if (!challan) {
      throw new NotFoundError('Challan not found');
    }

    // Block deletion of confirmed challans
    if (challan.status === ChallanStatus.CONFIRMED) {
      throw new BadRequestError('Cannot delete a confirmed challan. Cancel it first to safely return stock.');
    }

    // Cascade delete on ChallanItems is set in schema
    return await tx.challan.delete({
      where: { id },
    });
  });
};
