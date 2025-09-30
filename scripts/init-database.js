
#!/usr/bin/env node

/**
 * Script para inicializar o banco de dados PostgreSQL
 * Cria tabelas de admin e configura estrutura inicial
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeDatabase() {
  console.log('🚀 Initializing database...');

  try {
    // Verificar se as tabelas de admin existem
    console.log('📋 Checking admin tables...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['tenants', 'users', 'admin_users', 'registration_keys']);

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
      return;
    }

    const existingTables = tables?.map(t => t.table_name) || [];
    console.log('📊 Existing tables:', existingTables);

    // Verificar se as funções necessárias existem
    console.log('🔧 Checking required functions...');
    
    const { data: functions, error: functionsError } = await supabase.rpc('execute_sql', {
      query_text: "SELECT proname FROM pg_proc WHERE proname = 'execute_sql'"
    });

    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError);
      return;
    }

    if (!functions || functions.length === 0) {
      console.log('⚠️  execute_sql function not found. Please run the migration first.');
      return;
    }

    console.log('✅ Database structure verified');
    console.log('🎉 Database initialization complete!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeDatabase().catch(console.error);
}

module.exports = { initializeDatabase };
