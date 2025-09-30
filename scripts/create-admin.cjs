const bcrypt = require('bcryptjs');

/**
 * Script para criar usuário administrador inicial
 * Execute: node scripts/create-admin.cjs
 */

async function createAdmin() {
  console.log('🔧 Script de criação de usuário admin');
  console.log('');
  
  const adminData = {
    email: 'admin@legalsaas.com',
    password: 'admin123456',
    name: 'Administrador Sistema',
    role: 'superadmin'
  };

  try {
    // Hash da senha
    const hashedPassword = await bcrypt.hash(adminData.password, 12);
    
    console.log('📋 Dados do usuário admin:');
    console.log(`Email: ${adminData.email}`);
    console.log(`Senha: ${adminData.password}`);
    console.log(`Nome: ${adminData.name}`);
    console.log(`Role: ${adminData.role}`);
    console.log(`Password Hash: ${hashedPassword}`);
    console.log('');
    
    console.log('💾 SQL para criar o usuário admin no banco:');
    console.log('');
    console.log(`INSERT INTO admin_users (id, email, password, name, role, is_active, created_at, updated_at) VALUES`);
    console.log(`('${generateUUID()}', '${adminData.email}', '${hashedPassword}', '${adminData.name}', '${adminData.role}', true, NOW(), NOW());`);
    console.log('');
    
    console.log('✅ Execute o SQL acima no seu banco PostgreSQL para criar o usuário admin.');
    console.log('');
    console.log('🔐 Credenciais de acesso ao painel admin:');
    console.log(`URL: http://localhost:5000/admin`);
    console.log(`Email: ${adminData.email}`);
    console.log(`Senha: ${adminData.password}`);
    
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

createAdmin();