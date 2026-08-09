import app from '../src/app';
import { PrismaClient, Role } from '@prisma/client';
import { Server } from 'http';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- STARTING CHALLANS API VERIFICATION TESTS ---');
  let server: Server;
  let baseUrl: string;

  // 1. Start express server on a random port
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === 'object' && address !== null) {
        baseUrl = `http://localhost:${address.port}/api`;
        console.log(`Server started on ${baseUrl}`);
      }
      resolve();
    });
  });

  // Helper: Login and get token
  async function login(email: string, password: string): Promise<string> {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body: any = await res.json();
    if (!res.ok) {
      throw new Error(`Login failed for ${email}: ${body.message}`);
    }
    return body.data.token;
  }

  try {
    // 2. Obtain tokens for different roles
    const adminToken = await login('admin@example.com', 'admin123');
    const salesToken = await login('sales@example.com', 'sales123');
    const warehouseToken = await login('warehouse@example.com', 'warehouse123');

    console.log('✓ Successfully authenticated users.');

    // 3. Fetch a customer and two products from DB to use as test subjects
    const customer = await prisma.customer.findFirst({
      where: { status: 'ACTIVE' },
    });
    const product1 = await prisma.product.findUnique({ where: { sku: 'LAP-DELL-01' } });
    const product2 = await prisma.product.findUnique({ where: { sku: 'MOU-LOGI-02' } });

    if (!customer || !product1 || !product2) {
      throw new Error('Required seeded data (customer, products) not found in database. Run prisma seed.');
    }

    console.log(`Using Customer: ${customer.customerName} (${customer.id})`);
    console.log(`Product 1: ${product1.productName} (Current Stock: ${product1.currentStock})`);
    console.log(`Product 2: ${product2.productName} (Current Stock: ${product2.currentStock})`);

    // Store initial stocks
    const initStockP1 = product1.currentStock;
    const initStockP2 = product2.currentStock;

    // --- TEST 1: Create Draft Challan (as SALES role) ---
    console.log('\n--- Test 1: Create DRAFT Challan (as SALES) ---');
    const createRes = await fetch(`${baseUrl}/challans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        customerId: customer.id,
        status: 'DRAFT',
        items: [
          { productId: product1.id, quantity: 2 },
          { productId: product2.id, quantity: 5 },
        ],
      }),
    });

    const createBody: any = await createRes.json();
    if (createRes.status !== 201) {
      throw new Error(`Failed to create Challan: ${JSON.stringify(createBody)}`);
    }

    const challan = createBody.data;
    console.log(`✓ Challan created successfully: ${challan.challanNumber} (ID: ${challan.id})`);
    if (challan.status !== 'DRAFT') throw new Error(`Expected status DRAFT but got ${challan.status}`);

    // Verify stock has not changed for DRAFT
    const stockCheckD1 = await prisma.product.findUnique({ where: { id: product1.id } });
    const stockCheckD2 = await prisma.product.findUnique({ where: { id: product2.id } });
    if (stockCheckD1!.currentStock !== initStockP1 || stockCheckD2!.currentStock !== initStockP2) {
      throw new Error('Stock should NOT be modified when a challan is in DRAFT state');
    }
    console.log('✓ Stock remained unchanged for DRAFT challan.');

    // --- TEST 2: Update DRAFT Challan items (as SALES role) ---
    console.log('\n--- Test 2: Update DRAFT Challan items (as SALES) ---');
    const updateRes = await fetch(`${baseUrl}/challans/${challan.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        items: [
          { productId: product1.id, quantity: 3 },
          { productId: product2.id, quantity: 4 },
        ],
      }),
    });

    const updateBody: any = await updateRes.json();
    if (updateRes.status !== 200) {
      throw new Error(`Failed to update Challan: ${JSON.stringify(updateBody)}`);
    }
    console.log('✓ Challan items updated successfully.');
    if (updateBody.data.totalQuantity !== 7) {
      throw new Error(`Expected total quantity of 7 but got ${updateBody.data.totalQuantity}`);
    }

    // --- TEST 3: Confirm Challan (as SALES role) ---
    console.log('\n--- Test 3: Confirm Challan (as SALES) ---');
    const beforeConfirmTime = new Date();
    const confirmRes = await fetch(`${baseUrl}/challans/${challan.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        status: 'CONFIRMED',
      }),
    });

    const confirmBody: any = await confirmRes.json();
    if (confirmRes.status !== 200) {
      throw new Error(`Failed to confirm Challan: ${JSON.stringify(confirmBody)}`);
    }
    console.log(`✓ Challan status changed to: ${confirmBody.data.status}`);

    // Verify stock is decremented
    const stockCheckC1 = await prisma.product.findUnique({ where: { id: product1.id } });
    const stockCheckC2 = await prisma.product.findUnique({ where: { id: product2.id } });
    console.log(`Product 1 Stock: ${initStockP1} -> ${stockCheckC1!.currentStock} (Expected: ${initStockP1 - 3})`);
    console.log(`Product 2 Stock: ${initStockP2} -> ${stockCheckC2!.currentStock} (Expected: ${initStockP2 - 4})`);

    if (stockCheckC1!.currentStock !== initStockP1 - 3 || stockCheckC2!.currentStock !== initStockP2 - 4) {
      throw new Error('Stock was not decremented correctly on confirmation');
    }
    console.log('✓ Stock decremented correctly.');

    // Verify stock movement OUT logs (only records created during this test run)
    const movements = await prisma.stockMovement.findMany({
      where: {
        reason: `Sales Challan ${challan.challanNumber}`,
        createdAt: { gte: beforeConfirmTime },
      },
    });
    if (movements.length !== 2) {
      throw new Error(`Expected 2 stock movements logged but found ${movements.length}`);
    }
    console.log('✓ Stock movement OUT records successfully logged.');

    // --- TEST 4: Attempt to modify confirmed challan details (should FAIL) ---
    console.log('\n--- Test 4: Attempt to update confirmed details (should FAIL) ---');
    const badUpdateRes = await fetch(`${baseUrl}/challans/${challan.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: product1.id, quantity: 10 }],
      }),
    });
    const badUpdateBody: any = await badUpdateRes.json();
    if (badUpdateRes.status === 200) {
      throw new Error('Expected update of confirmed challan items to fail, but it succeeded');
    }
    console.log(`✓ Attempt blocked as expected: status code ${badUpdateRes.status}, message: "${badUpdateBody.message}"`);

    // --- TEST 5: Cancel Confirmed Challan (should return stock and log IN movements) ---
    console.log('\n--- Test 5: Cancel Confirmed Challan (as SALES) ---');
    const beforeCancelTime = new Date();
    const cancelRes = await fetch(`${baseUrl}/challans/${challan.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        status: 'CANCELLED',
      }),
    });
    const cancelBody: any = await cancelRes.json();
    if (cancelRes.status !== 200) {
      throw new Error(`Failed to cancel challan: ${JSON.stringify(cancelBody)}`);
    }
    console.log('✓ Challan successfully cancelled.');

    // Verify stock is returned to original values
    const stockCheckX1 = await prisma.product.findUnique({ where: { id: product1.id } });
    const stockCheckX2 = await prisma.product.findUnique({ where: { id: product2.id } });
    console.log(`Product 1 Stock: ${stockCheckC1!.currentStock} -> ${stockCheckX1!.currentStock} (Expected: ${initStockP1})`);
    console.log(`Product 2 Stock: ${stockCheckC2!.currentStock} -> ${stockCheckX2!.currentStock} (Expected: ${initStockP2})`);

    if (stockCheckX1!.currentStock !== initStockP1 || stockCheckX2!.currentStock !== initStockP2) {
      throw new Error('Stock was not incremented back to original levels on cancellation');
    }
    console.log('✓ Stock successfully returned to inventory.');

    // Verify stock movement IN logs (only records created during this test run)
    const cancelMovements = await prisma.stockMovement.findMany({
      where: {
        reason: `Cancelled Challan ${challan.challanNumber}`,
        createdAt: { gte: beforeCancelTime },
      },
    });
    if (cancelMovements.length !== 2) {
      throw new Error(`Expected 2 return stock movements logged but found ${cancelMovements.length}`);
    }
    console.log('✓ Stock movement IN records successfully logged.');

    // --- TEST 6: Attempt to delete CONFIRMED challan (should FAIL) ---
    console.log('\n--- Test 6: Create & Confirm a new Challan, and attempt to delete it (should FAIL) ---');
    const testChallan2Res = await fetch(`${baseUrl}/challans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        customerId: customer.id,
        status: 'CONFIRMED',
        items: [{ productId: product1.id, quantity: 1 }],
      }),
    });
    const testChallan2Body: any = await testChallan2Res.json();
    const challan2Id = testChallan2Body.data.id;

    const delRes = await fetch(`${baseUrl}/challans/${challan2Id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const delBody: any = await delRes.json();
    if (delRes.status === 200) {
      throw new Error('Expected deletion of confirmed challan to fail, but it succeeded');
    }
    console.log(`✓ Attempt blocked as expected: status code ${delRes.status}, message: "${delBody.message}"`);

    // Clean up challan2 by cancelling it first, then deleting
    console.log('Cleaning up temporary confirmed challan...');
    await fetch(`${baseUrl}/challans/${challan2Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`,
      },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    await fetch(`${baseUrl}/challans/${challan2Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    // --- TEST 7: Delete CANCELLED challan (as ADMIN) ---
    console.log('\n--- Test 7: Delete CANCELLED Challan (as ADMIN) ---');
    const delCancelledRes = await fetch(`${baseUrl}/challans/${challan.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    if (delCancelledRes.status !== 200) {
      const delCancelledBody = await delCancelledRes.json();
      throw new Error(`Failed to delete cancelled challan: ${JSON.stringify(delCancelledBody)}`);
    }
    console.log('✓ Cancelled challan successfully deleted.');

    // Confirm it's gone from database
    const dbChallan = await prisma.challan.findUnique({ where: { id: challan.id } });
    if (dbChallan) {
      throw new Error('Challan is still present in database after deletion');
    }
    console.log('✓ Verified challan is gone from DB.');

    // --- TEST 8: Role-based permissions checks ---
    console.log('\n--- Test 8: Role Authorization Checks ---');

    // WAREHOUSE creating a challan (should FAIL)
    const badRoleRes = await fetch(`${baseUrl}/challans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${warehouseToken}`,
      },
      body: JSON.stringify({
        customerId: customer.id,
        items: [{ productId: product1.id, quantity: 1 }],
      }),
    });
    if (badRoleRes.status !== 403) {
      throw new Error(`Expected WAREHOUSE role creation to return 403 but got ${badRoleRes.status}`);
    }
    console.log('✓ WAREHOUSE role prevented from creating challan (403 Forbidden).');

    // SALES deleting a challan (should FAIL)
    const testChallan3Res = await fetch(`${baseUrl}/challans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        customerId: customer.id,
        status: 'DRAFT',
        items: [{ productId: product1.id, quantity: 1 }],
      }),
    });
    const testChallan3Body: any = await testChallan3Res.json();
    const challan3Id = testChallan3Body.data.id;

    const salesDelRes = await fetch(`${baseUrl}/challans/${challan3Id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${salesToken}`,
      },
    });
    if (salesDelRes.status !== 403) {
      throw new Error(`Expected SALES role deletion to return 403 but got ${salesDelRes.status}`);
    }
    console.log('✓ SALES role prevented from deleting challan (403 Forbidden).');

    // Clean up challan3
    await fetch(`${baseUrl}/challans/${challan3Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });

    console.log('\n--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('\n❌ Test execution failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    server.close();
    console.log('Server stopped.');
  }
}

runTests();
