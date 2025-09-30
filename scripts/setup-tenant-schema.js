import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTenantSchema() {
  try {
    console.log('🔧 Configurando schemas de tenant...');

    // Primeiro, vamos criar um tenant de teste se não existir
    const testTenantId = 'tenant-1';
    const schemaName = `tenant_${testTenantId.replace(/-/g, '')}`;

    // Verificar se o tenant existe
    let tenant;
    try {
      tenant = await prisma.tenant.findFirst({
        where: { schemaName }
      });
    } catch (error) {
      console.log('Tabela de tenants não existe ainda, será criada pela migration');
    }

    if (!tenant) {
      console.log(`📦 Criando tenant de teste: ${testTenantId}`);
      try {
        tenant = await prisma.tenant.create({
          data: {
            id: testTenantId,
            name: 'Tenant de Teste',
            schemaName,
            planType: 'basic',
            isActive: true,
            maxUsers: 10,
            maxStorage: BigInt(1073741824)
          }
        });
        console.log('✅ Tenant criado:', tenant.id);
      } catch (error) {
        console.log('⚠️  Tenant pode já existir ou tabela não está criada ainda');
      }
    }

    // Criar schema do tenant e tabelas
    console.log(`🗄️  Criando schema: ${schemaName}`);
    
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);

    // Criar tabela de tarefas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".tasks (
        id VARCHAR PRIMARY KEY,
        title VARCHAR NOT NULL,
        description TEXT,
        project_id VARCHAR,
        project_title VARCHAR,
        client_id VARCHAR,
        client_name VARCHAR,
        assigned_to VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'not_started',
        priority VARCHAR DEFAULT 'medium',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        estimated_hours DECIMAL,
        actual_hours DECIMAL,
        progress INTEGER DEFAULT 0,
        tags JSONB DEFAULT '[]',
        notes TEXT,
        subtasks JSONB DEFAULT '[]',
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Criar tabela de clientes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".clients (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR,
        phone VARCHAR,
        organization VARCHAR,
        address JSONB,
        budget DECIMAL,
        currency VARCHAR DEFAULT 'BRL',
        status VARCHAR DEFAULT 'active',
        tags JSONB DEFAULT '[]',
        notes TEXT,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
    `);

    console.log('✅ Schema e tabelas criados com sucesso!');
    console.log(`📋 Schema: ${schemaName}`);
    console.log('📊 Tabelas: tasks, clients');

  } catch (error) {
    console.error('❌ Erro ao configurar schema:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTenantSchema();