
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDealsTable() {
  try {
    console.log('🔧 Corrigindo tabela deals do Pipeline de Vendas...\n');

    // Buscar todos os tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, schemaName: true, name: true }
    });

    console.log(`📊 Encontrados ${tenants.length} tenants\n`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Processando tenant: ${tenant.name} (${tenant.schemaName})`);

      try {
        // Verificar se a tabela deals existe
        const tableExists = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '${tenant.schemaName}' 
            AND table_name = 'deals'
          );
        `);

        if (tableExists[0]?.exists) {
          console.log('  ⚠️  Tabela deals existe, corrigindo...');

          // Dropar a tabela existente (ela será recriada corretamente)
          await prisma.$executeRawUnsafe(`
            DROP TABLE IF EXISTS "${tenant.schemaName}".deals CASCADE;
          `);

          console.log('  ✅ Tabela deals removida e será recriada automaticamente');
        } else {
          console.log('  ℹ️  Tabela deals não existe, será criada automaticamente');
        }

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Correção concluída!\n');
    console.log('📋 A tabela deals será recriada automaticamente na próxima requisição.');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDealsTable();
