
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pdsgfvjhtunnzvtlrihw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkc2dmdmpodHVubnp2dGxyaWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTkwMzIsImV4cCI6MjA3MzAzNTAzMn0.XJzgbqFnUzzLWJgaowHMwtLex2rrV5KZZKBP0PePhQU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    console.log('🚀 Executando migrations...');

    // Listar arquivos de migration
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Encontradas ${files.length} migrations:`, files);

    for (const file of files) {
      console.log(`\n📋 Executando migration: ${file}`);
      
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Dividir em comandos separados
      const commands = sqlContent
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        if (command.trim()) {
          try {
            const { error } = await supabase.rpc('execute_sql', {
              query_text: command
            });
            
            if (error) {
              console.error(`❌ Erro no comando: ${command.substring(0, 100)}...`);
              console.error('Erro:', error);
            } else {
              console.log(`✅ Comando executado com sucesso`);
            }
          } catch (err) {
            console.error(`❌ Erro ao executar comando: ${err.message}`);
          }
        }
      }
    }

    // Criar admin user se não existir
    console.log('\n👤 Criando usuário admin...');
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert({
        email: 'admin@sistema.com',
        password_hash: '$2a$10$k8Y1THUNZ6K4WNKOCgxQMOANPKFV.rHZLSJ2J2HqYt3hf7P8.gAaG',
        name: 'Administrator',
        role: 'super_admin'
      });

    if (adminError && !adminError.message.includes('duplicate')) {
      console.error('❌ Erro ao criar admin:', adminError);
    } else {
      console.log('✅ Admin criado/verificado');
    }

    console.log('\n🎉 Migrations executadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

runMigrations();
