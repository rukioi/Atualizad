import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { database } from '../config/database';

export interface CreateKeyRequest {
  tenantId?: string;
  accountType: 'SIMPLES' | 'COMPOSTA' | 'GERENCIAL';
  usesAllowed?: number;
  expiresAt?: Date;
  singleUse?: boolean;
  metadata?: any;
}

export class RegistrationKeyService {
  async generateKey(request: CreateKeyRequest, createdBy: string): Promise<string> {
    try {
      console.log('Generating registration key with request:', request);
      
      // Generate random key
      const key = crypto.randomBytes(32).toString('hex');
      const keyHash = await bcrypt.hash(key, 12);
      
      console.log('Generated key hash, creating database record...');

      // Create key record with correct field names for Prisma
      const keyData = {
        keyHash,
        tenantId: request.tenantId || null,
        accountType: request.accountType,
        usesAllowed: request.usesAllowed || 1,
        usesLeft: request.usesAllowed || 1,
        singleUse: request.singleUse ?? true,
        expiresAt: request.expiresAt || null,
        metadata: request.metadata || {},
        createdBy: createdBy,
        usedLogs: [],
        revoked: false,
      };

      console.log('Creating key with data:', keyData);
      await database.createRegistrationKey(keyData);
      
      console.log('Registration key created successfully');
      return key; // Return plain key only once
    } catch (error) {
      console.error('Error in generateKey:', error);
      throw new Error(`Failed to generate registration key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listKeys(tenantId?: string) {
    const data = await database.getAllRegistrationKeys();
    
    if (tenantId) {
      return data.filter(key => key.tenant_id === tenantId);
    }
    
    return data;
  }

  async revokeKey(keyId: string) {
    await database.revokeRegistrationKey(keyId);
  }

  async getKeyUsage(keyId: string) {
    const keys = await database.getAllRegistrationKeys();
    const key = keys.find(k => k.id === keyId);

    if (!key) {
      throw new Error('Key not found');
    }

    return {
      id: key.id,
      accountType: key.account_type,
      usesAllowed: key.uses_allowed,
      usesLeft: key.uses_left,
      usedLogs: key.used_logs,
      revoked: key.revoked,
      expiresAt: key.expires_at,
      createdAt: key.created_at,
    };
  }
}

export const registrationKeyService = new RegistrationKeyService();