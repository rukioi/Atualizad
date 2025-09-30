#!/usr/bin/env node

/**
 * Script para criar chave de registro administrativa
 * Uso: node scripts/create-admin-key.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createAdminKey() {
  try {
    console.log('🔑 Gerando chave de registro administrativa...\n');

    // Gerar chave aleatória
    const key = crypto.randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(key, 12);

    // Criar registro no banco
    const registrationKey = await prisma.registrationKey.create({
      data: {
        keyHash,
        tenantId: null, // Null = criará novo tenant
        accountType: 'GERENCIAL',
        usesAllowed: 1,
        usesLeft: 1,
        singleUse: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        metadata: {
          purpose: 'Initial admin setup',
          createdBy: 'setup-script',
        },
        createdBy: 'system',
      },
    });

    console.log('✅ Chave de registro criada com sucesso!\n');
    console.log('📋 INFORMAÇÕES DA CHAVE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔑 Chave: ${key}`);
    console.log(`👤 Tipo de Conta: ${registrationKey.accountType}`);
    console.log(`🔢 Usos Permitidos: ${registrationKey.usesAllowed}`);
    console.log(`📅 Expira em: ${registrationKey.expiresAt?.toLocaleDateString('pt-BR')}`);
    console.log(`🆔 ID: ${registrationKey.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 COMO USAR:');
    console.log('1. Acesse o frontend do sistema');
    console.log('2. Vá para a página de registro');
    console.log('3. Use a chave acima para criar sua conta administrativa');
    console.log('4. Após o registro, você terá acesso completo ao sistema\n');

    console.log('⚠️  IMPORTANTE:');
    console.log('- Esta chave só pode ser usada UMA vez');
    console.log('- Guarde a chave em local seguro');
    console.log('- A chave expira em 7 dias');
    console.log('- Após usar, você pode gerar novas chaves pelo painel admin\n');

  } catch (error) {
    console.error('❌ Erro ao criar chave:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminKey();