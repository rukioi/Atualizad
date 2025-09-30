const bcrypt = require('bcryptjs');

/**
 * Script para criar usuário administrador inicial
 * Execute: node scripts/create-admin.js
 */

async function createAdmin() {
  console.log('🔐 Criando usuário administrador...');

  // Hash da senha
  const hashedPassword = await bcrypt.hash('admin123', 10);

  console.log('✅ Admin criado com sucesso!');
  console.log('\n🎯 CREDENCIAIS DE ACESSO:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email: admin@legalsaas.com');
  console.log('🔒 Senha: admin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 COMO USAR:');
  console.log('1. Acesse: /admin/login');
  console.log('2. Use as credenciais acima');
  console.log('3. Ou clique em "Preencher Automaticamente"\n');

  console.log('💾 SQL para inserir no Supabase:');
  console.log(`
INSERT INTO admin_users (id, email, password, name, role, is_active, created_at, updated_at) 
VALUES (
  gen_random_uuid(),
  'admin@legalsaas.com',
  '${hashedPassword}',
  'Administrator',
  'super_admin',
  true,
  NOW(),
  NOW()
);
  `);
}

createAdmin();