
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTenantSchema(tenantId) {
  // Remove hyphens from tenant ID to create valid schema name
  const schemaName = `tenant_${tenantId.replace(/-/g, '')}`;
  
  console.log(`Creating schema: ${schemaName} for tenant: ${tenantId}`);

  try {
    // Create schema
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    console.log(`Schema ${schemaName} created successfully`);

    // Create tables in the tenant schema
    const createTablesSQL = `
      -- Clients table
      CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        cpf_cnpj VARCHAR(20),
        address TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Projects table
      CREATE TABLE IF NOT EXISTS "${schemaName}".projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        client_id UUID,
        status VARCHAR(50) DEFAULT 'proposal',
        priority VARCHAR(20) DEFAULT 'medium',
        progress INTEGER DEFAULT 0,
        estimated_value DECIMAL(12,2),
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Tasks table
      CREATE TABLE IF NOT EXISTS "${schemaName}".tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_id UUID,
        assigned_to VARCHAR(255),
        status VARCHAR(50) DEFAULT 'not_started',
        priority VARCHAR(20) DEFAULT 'medium',
        due_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Transactions table
      CREATE TABLE IF NOT EXISTS "${schemaName}".transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        category VARCHAR(100),
        date DATE NOT NULL,
        project_id UUID,
        client_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Invoices table
      CREATE TABLE IF NOT EXISTS "${schemaName}".invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        number VARCHAR(50) NOT NULL,
        client_id UUID,
        project_id UUID,
        amount DECIMAL(12,2) NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await prisma.$executeRawUnsafe(createTablesSQL);
    console.log(`Tables created successfully in schema ${schemaName}`);

  } catch (error) {
    console.error(`Error creating schema ${schemaName}:`, error);
    throw error;
  }
}

async function createSchemasForAllTenants() {
  try {
    console.log('Getting all tenants...');
    
    // Get all tenants from admin schema
    const tenants = await prisma.$queryRawUnsafe(`
      SELECT id, name, "isActive" 
      FROM admin.tenants 
      WHERE "isActive" = true
    `);

    console.log(`Found ${tenants.length} active tenants`);

    for (const tenant of tenants) {
      console.log(`Processing tenant: ${tenant.name} (${tenant.id})`);
      await createTenantSchema(tenant.id);
    }

    console.log('All tenant schemas created successfully!');
  } catch (error) {
    console.error('Error creating tenant schemas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createSchemasForAllTenants();
}

module.exports = { createTenantSchema, createSchemasForAllTenants };
