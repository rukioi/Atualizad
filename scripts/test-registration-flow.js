
const bcrypt = require('bcryptjs');

async function testRegistrationFlow() {
  console.log('🧪 Testando fluxo completo de registro...\n');

  const baseUrl = 'http://localhost:3000/api';
  
  try {
    // 1. Login admin
    console.log('1. Fazendo login admin...');
    const adminLoginRes = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@legalsaas.com',
        password: 'admin123456'
      })
    });
    
    const adminLogin = await adminLoginRes.json();
    if (!adminLoginRes.ok) {
      throw new Error(`Admin login failed: ${adminLogin.error}`);
    }
    
    const adminToken = adminLogin.tokens.accessToken;
    console.log('✅ Admin login successful');

    // 2. Create registration key
    console.log('2. Criando registration key...');
    const createKeyRes = await fetch(`${baseUrl}/admin/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        accountType: 'SIMPLES',
        usesAllowed: 1,
        singleUse: true
      })
    });
    
    const keyResult = await createKeyRes.json();
    if (!createKeyRes.ok) {
      throw new Error(`Key creation failed: ${keyResult.error}`);
    }
    
    const registrationKey = keyResult.key;
    console.log('✅ Registration key created:', registrationKey.substring(0, 8) + '...');

    // 3. Register user
    console.log('3. Registrando usuário...');
    const registerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User',
        key: registrationKey
      })
    });
    
    const registerResult = await registerRes.json();
    if (!registerRes.ok) {
      throw new Error(`Registration failed: ${registerResult.error}`);
    }
    
    console.log('✅ User registered successfully');

    // 4. Login user
    console.log('4. Fazendo login do usuário...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123'
      })
    });
    
    const loginResult = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(`User login failed: ${loginResult.error}`);
    }
    
    console.log('✅ User login successful');
    console.log('\n🎉 Todos os testes passaram! O fluxo de registro está funcionando corretamente.');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    process.exit(1);
  }
}

testRegistrationFlow();
