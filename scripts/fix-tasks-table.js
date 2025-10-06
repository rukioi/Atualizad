
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTasksTable() {
  try {
    console.log('🔧 Analisando e corrigindo estrutura da tabela tasks...\n');

    // Buscar todos os tenants
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, schemaName: true, name: true }
    });

    console.log(`📊 Encontrados ${tenants.length} tenants\n`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Processando tenant: ${tenant.name} (${tenant.schemaName})`);

      try {
        // 1. Verificar se a tabela tasks existe
        const tableCheck = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = '${tenant.schemaName}'
            AND table_name = 'tasks'
          ) as exists
        `);

        if (!tableCheck[0]?.exists) {
          console.log('  ℹ️  Tabela tasks não existe, criando estrutura completa...');
          
          await prisma.$executeRawUnsafe(`
            CREATE TABLE "${tenant.schemaName}".tasks (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              title VARCHAR NOT NULL,
              description TEXT,
              project_id UUID,
              project_title VARCHAR,
              client_id UUID,
              client_name VARCHAR,
              assigned_to VARCHAR NOT NULL,
              status VARCHAR DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
              priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
              start_date DATE,
              end_date DATE,
              estimated_hours DECIMAL(5,2),
              actual_hours DECIMAL(5,2),
              progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
              tags JSONB DEFAULT '[]'::jsonb,
              notes TEXT,
              subtasks JSONB DEFAULT '[]'::jsonb,
              created_by VARCHAR NOT NULL,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              is_active BOOLEAN DEFAULT TRUE
            );
          `);
          
          console.log('  ✅ Tabela tasks criada com estrutura completa');
          continue;
        }

        // 2. Buscar todas as colunas existentes
        const existingColumns = await prisma.$queryRawUnsafe(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = '${tenant.schemaName}'
          AND table_name = 'tasks'
        `);

        const columnNames = new Set(existingColumns.map(col => col.column_name));
        
        console.log(`  📋 Colunas existentes: ${existingColumns.length}`);

        // 3. Definir estrutura completa necessária
        const requiredColumns = [
          { name: 'client_id', type: 'UUID', nullable: true },
          { name: 'client_name', type: 'VARCHAR', nullable: true },
          { name: 'start_date', type: 'DATE', nullable: true },
          { name: 'end_date', type: 'DATE', nullable: true },
          { name: 'estimated_hours', type: 'DECIMAL(5,2)', nullable: true },
          { name: 'actual_hours', type: 'DECIMAL(5,2)', nullable: true },
          { name: 'subtasks', type: 'JSONB', default: "'[]'::jsonb" }
        ];

        // 4. Adicionar colunas faltantes
        for (const col of requiredColumns) {
          if (!columnNames.has(col.name)) {
            const nullClause = col.nullable !== false ? '' : 'NOT NULL';
            const defaultClause = col.default ? `DEFAULT ${col.default}` : '';
            
            await prisma.$executeRawUnsafe(`
              ALTER TABLE "${tenant.schemaName}".tasks 
              ADD COLUMN ${col.name} ${col.type} ${nullClause} ${defaultClause};
            `);
            
            console.log(`  ✅ Coluna adicionada: ${col.name} (${col.type})`);
          }
        }

        // 5. Migrar dados de due_date para end_date se necessário
        if (columnNames.has('due_date') && !columnNames.has('end_date')) {
          await prisma.$executeRawUnsafe(`
            UPDATE "${tenant.schemaName}".tasks 
            SET end_date = due_date 
            WHERE end_date IS NULL AND due_date IS NOT NULL;
          `);
          console.log('  ✅ Dados migrados de due_date para end_date');
        }

        // 6. Criar/atualizar índices
        const indexes = [
          { name: 'idx_tasks_assigned_to', column: 'assigned_to' },
          { name: 'idx_tasks_status', column: 'status' },
          { name: 'idx_tasks_priority', column: 'priority' },
          { name: 'idx_tasks_project_id', column: 'project_id' },
          { name: 'idx_tasks_client_id', column: 'client_id' },
          { name: 'idx_tasks_active', column: 'is_active' },
          { name: 'idx_tasks_created_by', column: 'created_by' }
        ];

        for (const idx of indexes) {
          await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS ${idx.name} 
            ON "${tenant.schemaName}".tasks(${idx.column});
          `);
        }

        console.log('  ✅ Índices verificados/criados');

        // 7. Validar estrutura final
        const finalColumns = await prisma.$queryRawUnsafe(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = '${tenant.schemaName}'
          AND table_name = 'tasks'
          ORDER BY ordinal_position
        `);

        console.log(`  ✅ Estrutura final: ${finalColumns.length} colunas`);

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Migração concluída!\n');
    console.log('📋 Estrutura da tabela tasks agora inclui:');
    console.log('   ✓ id, title, description');
    console.log('   ✓ project_id, project_title');
    console.log('   ✓ client_id, client_name (NOVO)');
    console.log('   ✓ assigned_to, status, priority, progress');
    console.log('   ✓ start_date, end_date (CORRIGIDO)');
    console.log('   ✓ estimated_hours, actual_hours');
    console.log('   ✓ tags, notes, subtasks (JSONB)');
    console.log('   ✓ created_by, created_at, updated_at, is_active\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixTasksTable();
