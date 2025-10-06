
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProjectsTable() {
  try {
    console.log('🔧 Corrigindo tabela projects do Pipeline de Vendas...\n');

    // Buscar todos os tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, schemaName: true, name: true }
    });

    console.log(`📊 Encontrados ${tenants.length} tenants\n`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Processando tenant: ${tenant.name} (${tenant.schemaName})`);

      try {
        // Remover NOT NULL das colunas antigas
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            -- Remover NOT NULL de colunas antigas que não são mais usadas
            IF EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = '${tenant.schemaName}' 
              AND table_name = 'projects' 
              AND column_name = 'name'
            ) THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN name DROP NOT NULL;
              RAISE NOTICE 'Column "name" set to nullable';
            END IF;

            IF EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = '${tenant.schemaName}' 
              AND table_name = 'projects' 
              AND column_name = 'client_name'
            ) THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN client_name DROP NOT NULL;
              RAISE NOTICE 'Column "client_name" set to nullable';
            END IF;

            IF EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = '${tenant.schemaName}' 
              AND table_name = 'projects' 
              AND column_name = 'status'
            ) THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN status DROP NOT NULL;
              RAISE NOTICE 'Column "status" set to nullable';
            END IF;

            IF EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = '${tenant.schemaName}' 
              AND table_name = 'projects' 
              AND column_name = 'priority'
            ) THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN priority DROP NOT NULL;
              RAISE NOTICE 'Column "priority" set to nullable';
            END IF;

            -- Garantir que apenas title, contact_name e created_by sejam NOT NULL
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN title SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN contact_name SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN created_by SET NOT NULL;
            
            -- Garantir que stage tenha valor padrão
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN stage SET DEFAULT 'contacted';

            RAISE NOTICE 'Projects table fixed successfully';
          END $$;
        `);

        console.log(`  ✅ Tabela projects corrigida com sucesso`);

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Correção concluída!\n');
    console.log('📋 Campos OBRIGATÓRIOS na tabela projects:');
    console.log('   1. title (Título do Negócio)');
    console.log('   2. contact_name (Nome do Contato)');
    console.log('   3. created_by (UUID do usuário)\n');
    console.log('📋 Campos OPCIONAIS:');
    console.log('   - description, organization, email, mobile, address');
    console.log('   - budget, currency, stage, tags, notes');
    console.log('   - client_id (FK opcional para clients)\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProjectsTable();
