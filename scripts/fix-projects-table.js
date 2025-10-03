
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProjectsTable() {
  try {
    console.log('🔧 Corrigindo estrutura da tabela projects...');

    // Buscar todos os tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true }
    });

    console.log(`Encontrados ${tenants.length} tenants ativos`);

    for (const tenant of tenants) {
      const schema = tenant.schemaName;
      console.log(`\n📦 Processando tenant: ${tenant.name} (${schema})`);

      try {
        // Verificar se a tabela existe
        const tableExists = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '${schema}'
            AND table_name = 'projects'
          )
        `);

        if (!tableExists[0]?.exists) {
          console.log(`  ⚠️  Tabela projects não existe no schema ${schema}`);
          continue;
        }

        // Remover constraints NOT NULL de colunas opcionais e colunas antigas
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            -- Remover NOT NULL de email e mobile
            ALTER TABLE "${schema}".projects ALTER COLUMN email DROP NOT NULL;
            ALTER TABLE "${schema}".projects ALTER COLUMN mobile DROP NOT NULL;
            
            -- Remover colunas antigas que não são mais usadas (se existirem)
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'client_name') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS client_name;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'name') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS name;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'status') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS status;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'priority') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS priority;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'progress') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS progress;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'estimated_value') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS estimated_value;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'start_date') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS start_date;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'end_date') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS end_date;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'due_date') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS due_date;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'completed_at') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS completed_at;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'assigned_to') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS assigned_to;
            END IF;
            
            IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'projects' AND column_name = 'contacts') THEN
              ALTER TABLE "${schema}".projects DROP COLUMN IF EXISTS contacts;
            END IF;
            
            -- Alterar created_by para UUID se for VARCHAR
            IF EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = '${schema}' 
              AND table_name = 'projects' 
              AND column_name = 'created_by'
              AND data_type = 'character varying'
            ) THEN
              ALTER TABLE "${schema}".projects ALTER COLUMN created_by TYPE UUID USING created_by::uuid;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao processar schema ${schema}: %', SQLERRM;
          END $$;
        `);

        console.log(`  ✅ Estrutura corrigida com sucesso`);

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${schema}:`, error.message);
      }
    }

    console.log('\n✅ Processo concluído!');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProjectsTable();
