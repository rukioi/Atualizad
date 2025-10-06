
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTasksTable() {
  try {
    console.log('🔧 Adicionando coluna client_id na tabela tasks...\n');

    // Buscar todos os tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, schemaName: true, name: true }
    });

    console.log(`📊 Encontrados ${tenants.length} tenants\n`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Processando tenant: ${tenant.name} (${tenant.schemaName})`);

      try {
        // Verificar se a tabela tasks existe
        const tableCheck = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '${tenant.schemaName}'
            AND table_name = 'tasks'
          ) as exists
        `);

        if (!tableCheck[0]?.exists) {
          console.log('  ℹ️  Tabela tasks não existe, pulando...');
          continue;
        }

        // Verificar se a coluna client_id já existe
        const columnCheck = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = '${tenant.schemaName}'
            AND table_name = 'tasks'
            AND column_name = 'client_id'
          ) as exists
        `);

        if (columnCheck[0]?.exists) {
          console.log('  ✅ Coluna client_id já existe');
          continue;
        }

        // Adicionar coluna client_id
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${tenant.schemaName}".tasks 
          ADD COLUMN client_id UUID,
          ADD COLUMN client_name VARCHAR;
        `);

        console.log('  ✅ Colunas client_id e client_name adicionadas');

        // Criar índice
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS idx_tasks_client_id 
          ON "${tenant.schemaName}".tasks(client_id);
        `);

        console.log('  ✅ Índice idx_tasks_client_id criado');

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Migração concluída!\n');
    console.log('📋 Estrutura da tabela tasks agora inclui:');
    console.log('   - client_id (UUID) - ID do cliente relacionado (opcional)');
    console.log('   - client_name (VARCHAR) - Nome do cliente (opcional)\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixTasksTable();
