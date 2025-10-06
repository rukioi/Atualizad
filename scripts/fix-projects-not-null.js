
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProjectsNotNull() {
  try {
    console.log('🔧 Removendo constraints NOT NULL desnecessárias da tabela projects...\n');

    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, schemaName: true, name: true }
    });

    console.log(`📊 Encontrados ${tenants.length} tenants ativos\n`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Processando tenant: ${tenant.name} (${tenant.schemaName})`);

      try {
        // Verificar se a tabela existe
        const tableCheck = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '${tenant.schemaName}'
            AND table_name = 'projects'
          ) as exists
        `);

        if (!tableCheck[0]?.exists) {
          console.log('  ⚠️  Tabela projects não existe, pulando...');
          continue;
        }

        // Remover NOT NULL de TODOS os campos opcionais
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            -- Remover NOT NULL de TODOS os campos opcionais
            -- MANTER NOT NULL apenas em: title, client_name, status, priority, start_date, due_date, created_by
            
            -- Campos opcionais - remover NOT NULL
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN description DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN client_id DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN organization DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN address DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN budget DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN currency DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN progress DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN completed_at DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN tags DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN assigned_to DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN notes DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN contacts DROP NOT NULL;
            
            -- Remover NOT NULL de colunas antigas que podem existir
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${tenant.schemaName}' AND table_name = 'projects' AND column_name = 'name') THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN name DROP NOT NULL;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${tenant.schemaName}' AND table_name = 'projects' AND column_name = 'contact_name') THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN contact_name DROP NOT NULL;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${tenant.schemaName}' AND table_name = 'projects' AND column_name = 'email') THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN email DROP NOT NULL;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${tenant.schemaName}' AND table_name = 'projects' AND column_name = 'mobile') THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN mobile DROP NOT NULL;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${tenant.schemaName}' AND table_name = 'projects' AND column_name = 'stage') THEN
              ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN stage DROP NOT NULL;
            END IF;
            
            -- Garantir valores padrão onde necessário
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN currency SET DEFAULT 'BRL';
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN status SET DEFAULT 'contacted';
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN priority SET DEFAULT 'medium';
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN progress SET DEFAULT 0;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN tags SET DEFAULT '[]'::jsonb;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN assigned_to SET DEFAULT '[]'::jsonb;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN contacts SET DEFAULT '[]'::jsonb;
            
            -- Garantir NOT NULL apenas nos campos obrigatórios
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN title SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN client_name SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN status SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN priority SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN start_date SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN due_date SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN created_by SET NOT NULL;
            
            RAISE NOTICE 'Constraints NOT NULL corrigidas com sucesso';
          EXCEPTION 
            WHEN OTHERS THEN
              RAISE NOTICE 'Erro ao corrigir constraints: %', SQLERRM;
          END $$;
        `);

        console.log('  ✅ Constraints corrigidas com sucesso');

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Correção concluída!\n');
    console.log('📋 Campos OBRIGATÓRIOS (NOT NULL):');
    console.log('   1. title - Título do Projeto *');
    console.log('   2. client_name - Cliente *');
    console.log('   3. status - Status *');
    console.log('   4. priority - Prioridade *');
    console.log('   5. start_date - Data de Início *');
    console.log('   6. due_date - Data de Vencimento *');
    console.log('   7. created_by - Criado por (UUID) *\n');
    console.log('📋 Todos os outros campos são OPCIONAIS (podem ser NULL)\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixProjectsNotNull();
