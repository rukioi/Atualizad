
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateExistingTenants() {
  try {
    console.log('🔄 Starting migration of existing tenants...');

    // Get all existing tenants
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${tenants.length} tenants to migrate`);

    for (const tenant of tenants) {
      console.log(`\n📋 Processing tenant: ${tenant.name} (${tenant.id})`);
      
      try {
        // Check if schema name needs normalization
        let normalizedSchemaName = tenant.schemaName;
        
        if (!normalizedSchemaName || normalizedSchemaName.includes('-')) {
          // Generate new normalized schema name
          normalizedSchemaName = `tenant_${tenant.id.replace(/-/g, '')}`;
          
          console.log(`  📝 Updating schema name from "${tenant.schemaName}" to "${normalizedSchemaName}"`);
          
          // Update tenant record with normalized schema name
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { schemaName: normalizedSchemaName }
          });
        }

        // Check if schema exists
        const schemaCheckQuery = `
          SELECT EXISTS(
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = $1
          ) as schema_exists
        `;
        
        const schemaCheckResult = await prisma.$queryRawUnsafe(schemaCheckQuery, normalizedSchemaName);
        const schemaExists = schemaCheckResult?.[0]?.schema_exists;

        if (!schemaExists) {
          console.log(`  🗄️  Creating schema: ${normalizedSchemaName}`);
          await createTenantSchemaWithTables(normalizedSchemaName);
          console.log(`  ✅ Schema created successfully`);
        } else {
          console.log(`  ✅ Schema already exists: ${normalizedSchemaName}`);
          
          // Validate and create missing tables
          await validateAndCreateMissingTables(normalizedSchemaName);
        }

        // Add some sample data if tables are empty
        await ensureSampleData(normalizedSchemaName);

      } catch (error) {
        console.error(`  ❌ Error processing tenant ${tenant.name}:`, error);
        continue; // Continue with next tenant
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    
    // Generate summary report
    await generateMigrationReport();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createTenantSchemaWithTables(schemaName) {
  try {
    // Create schema
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Create all required tables
    const createTablesSQL = `
      -- Clients table (CRM)
      CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
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
      );

      -- Projects table
      CREATE TABLE IF NOT EXISTS "${schemaName}".projects (
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
      );

      -- Tasks table
      CREATE TABLE IF NOT EXISTS "${schemaName}".tasks (
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
      );

      -- Transactions table (Cash Flow)
      CREATE TABLE IF NOT EXISTS "${schemaName}".transactions (
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
      );

      -- Invoices table (Billing)
      CREATE TABLE IF NOT EXISTS "${schemaName}".invoices (
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
      );

      -- Publications table
      CREATE TABLE IF NOT EXISTS "${schemaName}".publications (
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
      );

      -- Categories table (for transactions)
      CREATE TABLE IF NOT EXISTS "${schemaName}".categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        color VARCHAR(7) DEFAULT '#000000',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_clients_email" ON "${schemaName}".clients(email);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_clients_active" ON "${schemaName}".clients(is_active);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_projects_status" ON "${schemaName}".projects(status);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_projects_active" ON "${schemaName}".projects(is_active);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_tasks_status" ON "${schemaName}".tasks(status);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_tasks_active" ON "${schemaName}".tasks(is_active);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_transactions_type" ON "${schemaName}".transactions(type);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_transactions_date" ON "${schemaName}".transactions(date);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_transactions_active" ON "${schemaName}".transactions(is_active);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_invoices_status" ON "${schemaName}".invoices(status);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_invoices_active" ON "${schemaName}".invoices(is_active);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_publications_status" ON "${schemaName}".publications(status);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_publications_active" ON "${schemaName}".publications(is_active);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_categories_type" ON "${schemaName}".categories(type);
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_categories_active" ON "${schemaName}".categories(is_active);
    `;

    await prisma.$executeRawUnsafe(createTablesSQL);
    console.log(`    ✅ All tables created in schema: ${schemaName}`);

  } catch (error) {
    console.error(`    ❌ Error creating schema ${schemaName}:`, error);
    throw error;
  }
}

async function validateAndCreateMissingTables(schemaName) {
  try {
    const requiredTables = [
      'clients', 'projects', 'tasks', 'transactions', 
      'invoices', 'publications', 'categories'
    ];

    // Check which tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
    `;
    
    const existingTables = await prisma.$queryRawUnsafe(tablesQuery, schemaName);
    const existingTableNames = existingTables.map(t => t.table_name);
    
    const missingTables = requiredTables.filter(table => 
      !existingTableNames.includes(table)
    );

    if (missingTables.length > 0) {
      console.log(`    📋 Creating missing tables: ${missingTables.join(', ')}`);
      
      // Recreate all tables to ensure consistency
      await createTenantSchemaWithTables(schemaName);
    } else {
      console.log(`    ✅ All required tables exist`);
    }

  } catch (error) {
    console.error(`    ❌ Error validating tables for ${schemaName}:`, error);
    throw error;
  }
}

async function ensureSampleData(schemaName) {
  try {
    // Check if there's any data in main tables
    const clientsCountQuery = `SELECT COUNT(*) as count FROM "${schemaName}".clients`;
    const clientsResult = await prisma.$queryRawUnsafe(clientsCountQuery);
    const clientsCount = parseInt(clientsResult[0]?.count || '0');

    if (clientsCount === 0) {
      console.log(`    📊 Adding sample data to ${schemaName}...`);
      
      // Add sample categories
      const categoriesQuery = `
        INSERT INTO "${schemaName}".categories (name, type, color, description, created_by) VALUES
        ('Consultoria', 'income', '#10B981', 'Serviços de consultoria jurídica', 'system'),
        ('Honorários', 'income', '#3B82F6', 'Honorários advocatícios', 'system'),
        ('Escritório', 'expense', '#EF4444', 'Despesas do escritório', 'system'),
        ('Marketing', 'expense', '#F59E0B', 'Investimentos em marketing', 'system')
        ON CONFLICT DO NOTHING
      `;
      
      await prisma.$executeRawUnsafe(categoriesQuery);
      console.log(`    ✅ Sample categories added`);
    }

  } catch (error) {
    console.warn(`    ⚠️  Could not add sample data to ${schemaName}:`, error.message);
  }
}

async function generateMigrationReport() {
  try {
    console.log('\n📊 MIGRATION REPORT');
    console.log('==================');

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'asc' }
    });

    for (const tenant of tenants) {
      console.log(`\n📋 Tenant: ${tenant.name}`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Schema: ${tenant.schemaName}`);
      console.log(`   Status: ${tenant.isActive ? '✅ Active' : '❌ Inactive'}`);
      
      try {
        // Check schema exists
        const schemaCheckQuery = `
          SELECT EXISTS(
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = $1
          ) as schema_exists
        `;
        
        const schemaResult = await prisma.$queryRawUnsafe(schemaCheckQuery, tenant.schemaName);
        const schemaExists = schemaResult?.[0]?.schema_exists;
        
        console.log(`   Schema exists: ${schemaExists ? '✅ Yes' : '❌ No'}`);
        
        if (schemaExists) {
          // Count tables
          const tablesQuery = `
            SELECT COUNT(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = $1
          `;
          
          const tablesResult = await prisma.$queryRawUnsafe(tablesQuery, tenant.schemaName);
          const tableCount = tablesResult?.[0]?.table_count || 0;
          
          console.log(`   Tables: ${tableCount}`);
          
          // Count users
          const users = await prisma.user.findMany({
            where: { tenantId: tenant.id },
            select: { id: true, name: true, isActive: true }
          });
          
          console.log(`   Users: ${users.length}`);
          users.forEach(user => {
            console.log(`     - ${user.name} (${user.isActive ? 'Active' : 'Inactive'})`);
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Error checking tenant: ${error.message}`);
      }
    }

    console.log('\n🎉 Migration report completed!');

  } catch (error) {
    console.error('Error generating migration report:', error);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateExistingTenants()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateExistingTenants, createTenantSchemaWithTables };
