import prisma from '../lib/prisma';
import { CustomerType, CustomerStatus } from '@prisma/client';

interface GetCustomersParams {
  search?: string;
  type?: CustomerType;
  status?: CustomerStatus;
  page?: number;
  limit?: number;
}

export const getCustomers = async (params: GetCustomersParams) => {
  const { search, type, status, page = 1, limit = 10 } = params;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { businessName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (type) {
    where.customerType = type;
  }

  if (status) {
    where.status = status;
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
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
    customers,
  };
};

export const getCustomerById = async (id: string) => {
  return await prisma.customer.findUnique({
    where: { id },
  });
};

export const createCustomer = async (data: any) => {
  return await prisma.customer.create({
    data: {
      customerName: data.customerName,
      mobile: data.mobileNumber, // map mobileNumber from request to mobile in DB
      email: data.email.toLowerCase(),
      businessName: data.businessName,
      gstNumber: data.gstNumber || null,
      customerType: data.customerType,
      address: data.address,
      status: data.status || CustomerStatus.ACTIVE,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      notes: data.notes || null,
    },
  });
};

export const updateCustomer = async (id: string, data: any) => {
  const updateData: any = {};

  if (data.customerName !== undefined) updateData.customerName = data.customerName;
  if (data.mobileNumber !== undefined) updateData.mobile = data.mobileNumber;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase();
  if (data.businessName !== undefined) updateData.businessName = data.businessName;
  if (data.gstNumber !== undefined) updateData.gstNumber = data.gstNumber || null;
  if (data.customerType !== undefined) updateData.customerType = data.customerType;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.followUpDate !== undefined) updateData.followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return await prisma.customer.update({
    where: { id },
    data: updateData,
  });
};

export const deleteCustomer = async (id: string) => {
  return await prisma.customer.delete({
    where: { id },
  });
};
