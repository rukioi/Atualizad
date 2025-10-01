// SCRIPT CORRIGIDO: Usando import ao invés de require
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function createTestTenant() {
  try {
    console.log('📦 Creating test tenant...');
    
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Escritório Teste',
        schemaName: `tenant_test_${Date.now()}`,
        planType: 'basic',
        isActive: true,
        maxUsers: 5,
        maxStorage: BigInt(1073741824) // 1GB
      }
    });
    
    console.log('✅ Test tenant created successfully!');
    console.log('Tenant ID:', tenant.id);
    console.log('Schema Name:', tenant.schemaName);
    
    return tenant;
  } catch (error) {
    console.error('❌ Error creating test tenant:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestTenant()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
