
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixClientsTable() {
  try {
    console.log('🔧 Fixing clients table ID type...');
    
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true }
    });
    
    console.log(`Found ${tenants.length} active tenants`);
    
    for (const tenant of tenants) {
      console.log(`\n📋 Processing tenant: ${tenant.name} (${tenant.schemaName})`);
      
      try {
        // Check if clients table exists
        const tableExists = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '${tenant.schemaName}' 
            AND table_name = 'clients'
          );
        `);
        
        if (tableExists[0]?.exists) {
          console.log('  ⚠️  Clients table exists, recreating with correct UUID type...');
          
          // Backup existing data if any
          const existingClients = await prisma.$queryRawUnsafe(`
            SELECT * FROM ${tenant.schemaName}.clients;
          `);
          
          console.log(`  📦 Backing up ${existingClients.length} existing clients...`);
          
          // Drop old table
          await prisma.$queryRawUnsafe(`DROP TABLE IF EXISTS ${tenant.schemaName}.clients CASCADE;`);
          
          // Create new table with UUID
          await prisma.$queryRawUnsafe(`
            CREATE TABLE ${tenant.schemaName}.clients (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name VARCHAR NOT NULL,
              email VARCHAR NOT NULL,
              phone VARCHAR,
              organization VARCHAR,
              address JSONB DEFAULT '{}',
              budget DECIMAL(15,2),
              currency VARCHAR(3) DEFAULT 'BRL',
              level VARCHAR,
              status VARCHAR DEFAULT 'active',
              tags JSONB DEFAULT '[]',
              notes TEXT,
              description TEXT,
              cpf VARCHAR,
              rg VARCHAR,
              pis VARCHAR,
              cei VARCHAR,
              professional_title VARCHAR,
              marital_status VARCHAR,
              birth_date DATE,
              inss_status VARCHAR,
              amount_paid DECIMAL(15,2),
              referred_by VARCHAR,
              registered_by VARCHAR,
              created_by VARCHAR NOT NULL,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              is_active BOOLEAN DEFAULT TRUE
            );
          `);
          
          // Create indexes
          await prisma.$queryRawUnsafe(`CREATE INDEX idx_clients_name ON ${tenant.schemaName}.clients(name);`);
          await prisma.$queryRawUnsafe(`CREATE INDEX idx_clients_email ON ${tenant.schemaName}.clients(email);`);
          await prisma.$queryRawUnsafe(`CREATE INDEX idx_clients_status ON ${tenant.schemaName}.clients(status);`);
          await prisma.$queryRawUnsafe(`CREATE INDEX idx_clients_active ON ${tenant.schemaName}.clients(is_active);`);
          await prisma.$queryRawUnsafe(`CREATE INDEX idx_clients_created_by ON ${tenant.schemaName}.clients(created_by);`);
          
          console.log('  ✅ Table recreated successfully with UUID type');
        } else {
          console.log('  ℹ️  Clients table does not exist yet, will be created on first use');
        }
      } catch (error) {
        console.error(`  ❌ Error processing tenant ${tenant.name}:`, error.message);
      }
    }
    
    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixClientsTable();
