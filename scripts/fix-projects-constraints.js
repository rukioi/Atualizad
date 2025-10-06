
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProjectsConstraints() {
  try {
    console.log('🔧 Corrigindo constraints da tabela projects...\n');

    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, schemaName: true, name: true }
    });

    console.log(`📊 Processando ${tenants.length} tenants\n`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Tenant: ${tenant.name} (${tenant.schemaName})`);

      try {
        // Verificar se tabela existe
        const tableCheck = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '${tenant.schemaName}'
            AND table_name = 'projects'
          ) as exists
        `);

        if (!tableCheck[0]?.exists) {
          console.log('  ⚠️  Tabela projects não encontrada, pulando...');
          continue;
        }

        // Remover constraints NOT NULL de colunas desnecessárias
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            -- Remover NOT NULL de TODAS as colunas antigas/duplicadas
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN name DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN contact_name DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN email DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN mobile DROP NOT NULL;
            
            -- Garantir que APENAS os campos essenciais sejam NOT NULL
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN title SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN client_name SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN status SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN priority SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN start_date SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN due_date SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN created_by SET NOT NULL;
            
            RAISE NOTICE 'Constraints corrigidas com sucesso';
          END $$;
        `);

        console.log('  ✅ Constraints corrigidas');

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Correção concluída!\n');
    console.log('📋 Campos OBRIGATÓRIOS (NOT NULL):');
    console.log('   1. title - Título do Projeto');
    console.log('   2. client_name - Cliente');
    console.log('   3. status - Status');
    console.log('   4. priority - Prioridade');
    console.log('   5. start_date - Data de Início');
    console.log('   6. due_date - Data de Vencimento');
    console.log('   7. created_by - Criado por (UUID)\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProjectsConstraints();
