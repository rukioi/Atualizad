
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProjectsFinal() {
  try {
    console.log('🔧 Correção FINAL da tabela projects...\n');

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

        // Remover ALL constraints NOT NULL exceto os 7 campos obrigatórios
        await prisma.$executeRawUnsafe(`
          DO $$ 
          DECLARE
            col_name TEXT;
            required_cols TEXT[] := ARRAY['title', 'client_name', 'status', 'priority', 'start_date', 'due_date', 'created_by'];
          BEGIN
            -- Loop através de todas as colunas da tabela projects
            FOR col_name IN 
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = '${tenant.schemaName}' 
              AND table_name = 'projects'
              AND is_nullable = 'NO'
              AND column_name NOT IN ('id', 'is_active', 'created_at', 'updated_at')
            LOOP
              -- Se a coluna NÃO está na lista de obrigatórias, remover NOT NULL
              IF NOT (col_name = ANY(required_cols)) THEN
                EXECUTE format('ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN %I DROP NOT NULL', col_name);
                RAISE NOTICE 'Removido NOT NULL de: %', col_name;
              END IF;
            END LOOP;

            -- Garantir que os campos obrigatórios tenham NOT NULL
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN title SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN client_name SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN status SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN priority SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN start_date SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN due_date SET NOT NULL;
            ALTER TABLE "${tenant.schemaName}".projects ALTER COLUMN created_by SET NOT NULL;

            -- Garantir valores default para campos opcionais que podem estar NULL
            UPDATE "${tenant.schemaName}".projects SET description = '' WHERE description IS NULL;
            UPDATE "${tenant.schemaName}".projects SET organization = '' WHERE organization IS NULL;
            UPDATE "${tenant.schemaName}".projects SET address = '' WHERE address IS NULL;
            UPDATE "${tenant.schemaName}".projects SET budget = 0 WHERE budget IS NULL;
            UPDATE "${tenant.schemaName}".projects SET currency = 'BRL' WHERE currency IS NULL;
            UPDATE "${tenant.schemaName}".projects SET progress = 0 WHERE progress IS NULL;
            UPDATE "${tenant.schemaName}".projects SET tags = '[]'::jsonb WHERE tags IS NULL;
            UPDATE "${tenant.schemaName}".projects SET assigned_to = '[]'::jsonb WHERE assigned_to IS NULL;
            UPDATE "${tenant.schemaName}".projects SET contacts = '[]'::jsonb WHERE contacts IS NULL;
            UPDATE "${tenant.schemaName}".projects SET notes = '' WHERE notes IS NULL;

          END $$;
        `);

        console.log('  ✅ Constraints corrigidas com sucesso');

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Correção FINAL concluída!\n');
    console.log('📋 CAMPOS OBRIGATÓRIOS (NOT NULL):');
    console.log('   1. title - Título do Projeto *');
    console.log('   2. client_name - Cliente *');
    console.log('   3. status - Status *');
    console.log('   4. priority - Prioridade *');
    console.log('   5. start_date - Data de Início *');
    console.log('   6. due_date - Data de Vencimento *');
    console.log('   7. created_by - Criado por (UUID) *\n');
    console.log('📋 TODOS OS OUTROS CAMPOS SÃO OPCIONAIS (NULL permitido)\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixProjectsFinal();
