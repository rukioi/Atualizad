#!/usr/bin/env node

/**
 * Test script for Invoices CRUD operations
 * Tests the invoicesService directly to verify all methods work properly
 */

import { invoicesService } from '../src/services/invoicesService.js';

const TEST_TENANT_ID = 'tenant-1';
const TEST_USER_ID = 'test-user-1';

async function testInvoicesCRUD() {
  try {
    console.log('🧪 Starting Invoices CRUD Test...\n');

    // Test 1: Create Invoice
    console.log('1️⃣ Testing CREATE invoice...');
    const newInvoiceData = {
      number: 'TEST-' + Date.now(),
      title: 'Test Invoice - CRUD Test',
      description: 'Test invoice for CRUD verification',
      clientName: 'Test Client Ltd',
      clientEmail: 'test@client.com',
      clientPhone: '(11) 99999-0000',
      amount: 1500.50,
      currency: 'BRL',
      status: 'draft',
      dueDate: '2025-12-31',
      items: [
        {
          id: 'item1',
          description: 'Test Service',
          quantity: 2,
          rate: 750.25,
          amount: 1500.50,
          tax: 0
        }
      ],
      tags: ['test', 'crud'],
      notes: 'This is a test invoice created by automated test'
    };

    const createdInvoice = await invoicesService.createInvoice(TEST_TENANT_ID, newInvoiceData, TEST_USER_ID);
    console.log('✅ Invoice created:', { id: createdInvoice.id, number: createdInvoice.number });

    // Test 2: Get Invoice by ID
    console.log('\n2️⃣ Testing GET invoice by ID...');
    const fetchedInvoice = await invoicesService.getInvoiceById(TEST_TENANT_ID, createdInvoice.id);
    if (fetchedInvoice) {
      console.log('✅ Invoice fetched:', { id: fetchedInvoice.id, title: fetchedInvoice.title });
    } else {
      throw new Error('Failed to fetch created invoice');
    }

    // Test 3: Update Invoice
    console.log('\n3️⃣ Testing UPDATE invoice...');
    const updateData = {
      title: 'Updated Test Invoice - CRUD Test',
      amount: 2000.75,
      status: 'pending'
    };
    const updatedInvoice = await invoicesService.updateInvoice(TEST_TENANT_ID, createdInvoice.id, updateData);
    if (updatedInvoice && updatedInvoice.title === updateData.title) {
      console.log('✅ Invoice updated:', { id: updatedInvoice.id, title: updatedInvoice.title, amount: updatedInvoice.amount });
    } else {
      throw new Error('Failed to update invoice');
    }

    // Test 4: Get Invoices List
    console.log('\n4️⃣ Testing GET invoices list...');
    const invoicesResult = await invoicesService.getInvoices(TEST_TENANT_ID, { limit: 10 });
    console.log('✅ Invoices list fetched:', { 
      total: invoicesResult.pagination.total, 
      count: invoicesResult.invoices.length 
    });

    // Test 5: Get Invoice Stats
    console.log('\n5️⃣ Testing GET invoice stats...');
    const stats = await invoicesService.getInvoicesStats(TEST_TENANT_ID);
    console.log('✅ Invoice stats:', stats);

    // Test 6: Delete Invoice
    console.log('\n6️⃣ Testing DELETE invoice...');
    const deleted = await invoicesService.deleteInvoice(TEST_TENANT_ID, createdInvoice.id);
    if (deleted) {
      console.log('✅ Invoice deleted successfully');
    } else {
      throw new Error('Failed to delete invoice');
    }

    // Test 7: Verify Deletion
    console.log('\n7️⃣ Testing GET deleted invoice (should not exist)...');
    const deletedInvoice = await invoicesService.getInvoiceById(TEST_TENANT_ID, createdInvoice.id);
    if (!deletedInvoice) {
      console.log('✅ Confirmed invoice was deleted (not found)');
    } else {
      throw new Error('Invoice still exists after deletion');
    }

    console.log('\n🎉 All CRUD tests passed successfully!');
    console.log('✅ The invoicesService is working properly with real PostgreSQL persistence');

  } catch (error) {
    console.error('\n❌ CRUD Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testInvoicesCRUD();