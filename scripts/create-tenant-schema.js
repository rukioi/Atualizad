
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

    // Define individual table creation statements to avoid multiple commands error
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        cpf_cnpj VARCHAR(20),
        address TEXT,
        notes TEXT,
        organization VARCHAR(255),
        budget DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'BRL',
        status VARCHAR(50) DEFAULT 'active',
        tags JSONB DEFAULT '[]',
        cpf VARCHAR(20),
        rg VARCHAR(20),
        professional_title VARCHAR(255),
        marital_status VARCHAR(50),
        birth_date DATE,
        created_by VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS "${schemaName}".projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        client_id UUID,
        client_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'proposal',
        priority VARCHAR(20) DEFAULT 'medium',
        progress INTEGER DEFAULT 0,
        budget DECIMAL(12,2),
        estimated_value DECIMAL(12,2),
        start_date DATE,
        end_date DATE,
        tags JSONB DEFAULT '[]',
        notes TEXT,
        created_by VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS "${schemaName}".tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_id UUID,
        project_title VARCHAR(255),
        assigned_to VARCHAR(255),
        status VARCHAR(50) DEFAULT 'not_started',
        priority VARCHAR(20) DEFAULT 'medium',
        progress INTEGER DEFAULT 0,
        due_date DATE,
        tags JSONB DEFAULT '[]',
        notes TEXT,
        created_by VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS "${schemaName}".transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        category_id VARCHAR(255),
        category VARCHAR(100),
        date DATE NOT NULL,
        payment_method VARCHAR(50),
        status VARCHAR(20) DEFAULT 'confirmed',
        project_id UUID,
        project_title VARCHAR(255),
        client_id UUID,
        client_name VARCHAR(255),
        tags JSONB DEFAULT '[]',
        notes TEXT,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurring_frequency VARCHAR(20),
        created_by VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      `CREATE TABLE IF NOT EXISTS "${schemaName}".invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        number VARCHAR(50) NOT NULL,
        client_id UUID,
        client_name VARCHAR(255),
        project_id UUID,
        project_name VARCHAR(255),
        amount DECIMAL(12,2) NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        description TEXT,
        items JSONB DEFAULT '[]',
        notes TEXT,
        created_by VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS "${schemaName}".publications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        type VARCHAR(50) DEFAULT 'notification',
        status VARCHAR(20) DEFAULT 'novo',
        user_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS "${schemaName}".categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        color VARCHAR(7) DEFAULT '#000000',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`
    ];

    // Execute each table creation separately
    for (const statement of tableStatements) {
      await prisma.$executeRawUnsafe(statement);
    }
    console.log(`Tables created successfully in schema ${schemaName}`);

    // Create indexes separately
    const indexStatements = [
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_clients_email ON "${schemaName}".clients(email)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_clients_status ON "${schemaName}".clients(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_clients_active ON "${schemaName}".clients(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_projects_status ON "${schemaName}".projects(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_projects_client_id ON "${schemaName}".projects(client_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_projects_active ON "${schemaName}".projects(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_tasks_status ON "${schemaName}".tasks(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_tasks_project_id ON "${schemaName}".tasks(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_tasks_active ON "${schemaName}".tasks(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_transactions_type ON "${schemaName}".transactions(type)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_transactions_date ON "${schemaName}".transactions(date)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_transactions_active ON "${schemaName}".transactions(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_invoices_status ON "${schemaName}".invoices(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_invoices_due_date ON "${schemaName}".invoices(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_invoices_active ON "${schemaName}".invoices(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_publications_status ON "${schemaName}".publications(status)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_publications_user_id ON "${schemaName}".publications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_publications_active ON "${schemaName}".publications(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_categories_type ON "${schemaName}".categories(type)`,
      `CREATE INDEX IF NOT EXISTS idx_${schemaName}_categories_active ON "${schemaName}".categories(is_active)`
    ];

    // Execute each index creation separately
    for (const statement of indexStatements) {
      await prisma.$executeRawUnsafe(statement);
    }
    console.log(`Indexes created successfully in schema ${schemaName}`);

  } catch (error) {
    console.error(`Error creating schema ${schemaName}:`, error);
    throw error;
  }
}

async function createSchemasForAllTenants() {
  try {
    console.log('Getting all tenants...');
    
    // Get all tenants from admin schema
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true }
    });

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
