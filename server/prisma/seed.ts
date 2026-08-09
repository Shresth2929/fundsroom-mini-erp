import { PrismaClient, Role, CustomerType, CustomerStatus, ChallanStatus, MovementType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // 1. Clear existing data in reverse order of dependencies
  await prisma.challanItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.challan.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Existing database records cleared.');

  // 2. Hash passwords for users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const salesPassword = await bcrypt.hash('sales123', 10);
  const warehousePassword = await bcrypt.hash('warehouse123', 10);
  const accountsPassword = await bcrypt.hash('accounts123', 10);

  // 3. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.create({
    data: {
      email: 'sales@example.com',
      password: salesPassword,
      name: 'Sales Manager',
      role: Role.SALES,
    },
  });

  const warehouse = await prisma.user.create({
    data: {
      email: 'warehouse@example.com',
      password: warehousePassword,
      name: 'Warehouse Keeper',
      role: Role.WAREHOUSE,
    },
  });

  const accounts = await prisma.user.create({
    data: {
      email: 'accounts@example.com',
      password: accountsPassword,
      name: 'Accounts Executive',
      role: Role.ACCOUNTS,
    },
  });

  console.log('Seeded users successfully.');

  // 4. Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      customerName: 'Rahul Sharma',
      mobile: '9876543210',
      email: 'rahul.sharma@example.com',
      businessName: 'Sharma Distributors',
      gstNumber: '07AAAAA1111A1Z1',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Plot 45, Sector 18, Noida, UP',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days later
      notes: 'Interested in bulk laptop orders for the upcoming festive season.',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      customerName: 'Priya Patel',
      mobile: '8765432109',
      email: 'priya.patel@example.com',
      businessName: 'Patel Retailers',
      gstNumber: '24BBBBB2222B2Z2',
      customerType: CustomerType.RETAIL,
      address: 'Shop 12, Sunrise Mall, Ahmedabad, Gujarat',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      notes: 'Requests weekly catalog updates for stock checks.',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      customerName: 'Vikram Singh',
      mobile: '7654321098',
      email: 'vikram.singh@example.com',
      businessName: 'Singh & Sons Wholesale',
      gstNumber: '08CCCCC3333C3Z3',
      customerType: CustomerType.WHOLESALE,
      address: 'C-234, Mansarovar, Jaipur, Rajasthan',
      status: CustomerStatus.LEAD,
      notes: 'Initial contact made. Needs negotiations on bulk pricing rates.',
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      customerName: 'Amit Gupta',
      mobile: '6543210987',
      email: 'amit.gupta@example.com',
      businessName: 'Gupta Traders',
      gstNumber: null,
      customerType: CustomerType.RETAIL,
      address: 'Gali 4, Sadar Bazar, Delhi',
      status: CustomerStatus.INACTIVE,
      notes: 'No response from client for past 3 months. Account set to inactive.',
    },
  });

  console.log('Seeded customers successfully.');

  // 5. Create Products
  const p1 = await prisma.product.create({
    data: {
      productName: 'Dell Inspiron 15 Laptop',
      sku: 'LAP-DELL-01',
      category: 'Electronics',
      unitPrice: 45000,
      currentStock: 15,
      minimumStock: 5,
      location: 'Rack A-3, Floor 1',
    },
  });

  const p2 = await prisma.product.create({
    data: {
      productName: 'Logitech MX Master 3S Mouse',
      sku: 'MOU-LOGI-02',
      category: 'Computer Accessories',
      unitPrice: 8500,
      currentStock: 80,
      minimumStock: 20,
      location: 'Rack B-1, Floor 1',
    },
  });

  const p3 = await prisma.product.create({
    data: {
      productName: 'HP LaserJet Pro Printer',
      sku: 'PRI-HP-03',
      category: 'Office Electronics',
      unitPrice: 15000,
      currentStock: 3, // Low stock, minimum is 5
      minimumStock: 5,
      location: 'Rack C-2, Floor 2',
    },
  });

  const p4 = await prisma.product.create({
    data: {
      productName: 'Samsung 27" Curved Monitor',
      sku: 'MON-SAMS-04',
      category: 'Electronics',
      unitPrice: 18000,
      currentStock: 12,
      minimumStock: 4,
      location: 'Rack D-1, Floor 2',
    },
  });

  console.log('Seeded products successfully.');

  // 6. Create Initial Stock Movements (IN)
  const productsList = [
    { p: p1, qty: 15 },
    { p: p2, qty: 80 },
    { p: p3, qty: 3 },
    { p: p4, qty: 12 },
  ];

  for (const item of productsList) {
    await prisma.stockMovement.create({
      data: {
        productId: item.p.id,
        quantity: item.qty,
        movementType: MovementType.IN,
        reason: 'Initial inventory seeding',
        createdById: warehouse.id,
      },
    });
  }

  console.log('Seeded initial stock movements.');

  // 7. Create Challans
  // Challan 1: Draft Challan
  const challan1 = await prisma.challan.create({
    data: {
      challanNumber: 'CH-20260808-001',
      customerId: customer1.id,
      status: ChallanStatus.DRAFT,
      createdById: sales.id,
      totalQuantity: 7,
      totalPrice: (2 * 45000) + (5 * 8500),
      items: {
        create: [
          {
            productId: p1.id,
            productNameSnapshot: p1.productName,
            quantity: 2,
            unitPriceSnapshot: p1.unitPrice,
            totalPrice: 2 * p1.unitPrice,
          },
          {
            productId: p2.id,
            productNameSnapshot: p2.productName,
            quantity: 5,
            unitPriceSnapshot: p2.unitPrice,
            totalPrice: 5 * p2.unitPrice,
          },
        ],
      },
    },
  });

  // Challan 2: Confirmed Challan (Requires stock deduction & stock movement log)
  // Let's create it as CONFIRMED.
  // To match the real-world flow, we adjust the product stock and create OUT movements.
  // Priya Patel buys 1 Monitor and 2 Mice.
  const monitorQty = 1;
  const mouseQty = 2;

  // Deduct stock in DB representation
  await prisma.product.update({
    where: { id: p4.id },
    data: { currentStock: { decrement: monitorQty } },
  });
  await prisma.product.update({
    where: { id: p2.id },
    data: { currentStock: { decrement: mouseQty } },
  });

  // Create Stock movements for Confirmed Challan
  await prisma.stockMovement.create({
    data: {
      productId: p4.id,
      quantity: monitorQty,
      movementType: MovementType.OUT,
      reason: 'Sales Challan CH-20260808-002',
      createdById: sales.id,
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: p2.id,
      quantity: mouseQty,
      movementType: MovementType.OUT,
      reason: 'Sales Challan CH-20260808-002',
      createdById: sales.id,
    },
  });

  await prisma.challan.create({
    data: {
      challanNumber: 'CH-20260808-002',
      customerId: customer2.id,
      status: ChallanStatus.CONFIRMED,
      createdById: sales.id,
      totalQuantity: monitorQty + mouseQty,
      totalPrice: (monitorQty * p4.unitPrice) + (mouseQty * p2.unitPrice),
      items: {
        create: [
          {
            productId: p4.id,
            productNameSnapshot: p4.productName,
            quantity: monitorQty,
            unitPriceSnapshot: p4.unitPrice,
            totalPrice: monitorQty * p4.unitPrice,
          },
          {
            productId: p2.id,
            productNameSnapshot: p2.productName,
            quantity: mouseQty,
            unitPriceSnapshot: p2.unitPrice,
            totalPrice: mouseQty * p2.unitPrice,
          },
        ],
      },
    },
  });

  console.log('Seeded challans and verified movements.');
  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
