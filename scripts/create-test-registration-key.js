const bcrypt = require('bcryptjs');

/**
 * Script para criar chave de registro de teste
 * Execute: node scripts/create-test-registration-key.js
 */

async function createRegistrationKey() {
  console.log('🗝️ Script de criação de chave de registro');
  console.log('');
  
  const keyData = {
    key: 'TESTE-GERENCIAL-2025',
    accountType: 'GERENCIAL',
    usesAllowed: 10,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
  };

  try {
    // Hash da chave
    const hashedKey = await bcrypt.hash(keyData.key, 10);
    
    console.log('📋 Dados da chave de registro:');
    console.log(`Chave: ${keyData.key}`);
    console.log(`Tipo de Conta: ${keyData.accountType}`);
    console.log(`Usos Permitidos: ${keyData.usesAllowed}`);
    console.log(`Expira em: ${keyData.expiresAt.toLocaleDateString('pt-BR')}`);
    console.log(`Key Hash: ${hashedKey}`);
    console.log('');
    
    console.log('💾 SQL para criar a chave de registro:');
    console.log('');
    console.log(`INSERT INTO registration_keys (id, key_hash, tenant_id, account_type, uses_allowed, uses_left, single_use, expires_at, revoked, created_by, created_at) VALUES`);
    console.log(`('${generateUUID()}', '${hashedKey}', NULL, '${keyData.accountType}', ${keyData.usesAllowed}, ${keyData.usesAllowed}, false, '${keyData.expiresAt.toISOString()}', false, 'admin', NOW());`);
    console.log('');
    
    console.log('✅ Execute o SQL acima no seu banco PostgreSQL para criar a chave.');
    console.log('');
    console.log('🔑 Use esta chave no registro de usuários:');
    console.log(`Chave: ${keyData.key}`);
    console.log(`Tipo: ${keyData.accountType} (acesso completo ao sistema)`);
    
  } catch (error) {
    console.error('❌ Erro ao criar chave:', error);
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

createRegistrationKey();