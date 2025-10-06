
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProjectsStructure() {
  try {
    console.log('🔧 Corrigindo estrutura da tabela projects...\n');

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

        // Alterar a estrutura da tabela para garantir todas as colunas necessárias
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            -- Garantir que APENAS os campos obrigatórios sejam NOT NULL
            -- Campos obrigatórios: title, client_name, status, priority, start_date, due_date, created_by
            
            -- Adicionar colunas que podem não existir (todas opcionais exceto as obrigatórias)
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS description TEXT;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS organization VARCHAR(255);
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS address TEXT;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2);
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'BRL';
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS assigned_to JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS notes TEXT;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS client_id UUID;
            
            -- Garantir campos obrigatórios
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS title VARCHAR(255);
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'contacted';
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS start_date DATE;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS due_date DATE;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS created_by UUID;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            ALTER TABLE "${tenant.schemaName}".projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            
            -- Remover NOT NULL de campos opcionais (garantir que APENAS os obrigatórios sejam NOT NULL)
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN description DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN organization DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN address DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN budget DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN currency DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN progress DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN notes DROP NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN client_id DROP NOT NULL;
            
            -- Garantir NOT NULL apenas nos campos obrigatórios
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN title SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN client_name SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN status SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN priority SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN start_date SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN due_date SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN created_by SET NOT NULL;
            
            -- Migrar dados de end_date para due_date se necessário
            UPDATE "${tenant.schemaName}".projects 
            SET due_date = end_date 
            WHERE due_date IS NULL AND end_date IS NOT NULL;
            
            RAISE NOTICE 'Projects table structure fixed successfully';
          EXCEPTION 
            WHEN OTHERS THEN
              RAISE NOTICE 'Error updating projects: %', SQLERRM;
          END $$;
        `);

        console.log('  ✅ Estrutura corrigida com sucesso');

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Correção concluída!\n');
    console.log('📋 Campos OBRIGATÓRIOS (NOT NULL):');
    console.log('   - title (Título do Projeto)');
    console.log('   - client_name (Cliente)');
    console.log('   - status (Status)');
    console.log('   - priority (Prioridade)');
    console.log('   - start_date (Data de Início)');
    console.log('   - due_date (Data de Vencimento)');
    console.log('   - created_by (UUID do usuário)\n');
    console.log('📋 Campos OPCIONAIS (podem ser NULL):');
    console.log('   - description, organization, address, budget, currency');
    console.log('   - progress, notes, client_id, tags, assigned_to, contacts\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixProjectsStructure();
