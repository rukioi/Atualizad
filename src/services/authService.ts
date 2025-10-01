
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../config/database';

export class AuthService {
  private accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'dev-secret-change-in-production';
  private refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';

  constructor() {
    // SEGURANÇA CRÍTICA: Fail hard em produção com secrets default
    if (process.env.NODE_ENV === 'production') {
      if (this.accessTokenSecret === 'dev-secret-change-in-production' || 
          this.refreshTokenSecret === 'dev-refresh-secret-change-in-production' ||
          !process.env.JWT_ACCESS_SECRET || 
          !process.env.JWT_REFRESH_SECRET) {
        const errorMsg = '🚨 CRITICAL SECURITY ERROR: JWT secrets must be set in production! Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async generateTokens(user: any) {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      ...(user.role ? { role: user.role } : {
        tenantId: user.tenantId || user.tenant_id,
        accountType: user.accountType || user.account_type,
      }),
    };

    const accessToken = jwt.sign(payload, this.accessTokenSecret, { 
      expiresIn: process.env.JWT_ACCESS_EXPIRES || '24h',
      issuer: 'legalsaas',
      audience: 'legalsaas-users'
    });
    
    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
      issuer: 'legalsaas',
      audience: 'legalsaas-users'
    });

    // Store refresh token in database
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      await database.createRefreshToken({
        tokenHash,
        userId: user.id,
        expiresAt: expiresAt.toISOString(),
        isActive: true
      });
    } catch (error) {
      console.error('Error storing refresh token:', error);
    }

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'legalsaas',
        audience: 'legalsaas-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'legalsaas',
        audience: 'legalsaas-users'
      });

      // Get all active refresh tokens for the user and compare
      const userId = (decoded as any).userId;
      const userTokens = await database.getActiveRefreshTokensForUser(userId);
      
      let isValidToken = false;
      for (const storedToken of userTokens) {
        if (await bcrypt.compare(token, storedToken.tokenHash)) {
          isValidToken = true;
          break;
        }
      }
      
      if (!isValidToken) {
        throw new Error('Refresh token not found or expired');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async refreshTokens(refreshToken: string) {
    const decoded = await this.verifyRefreshToken(refreshToken);
    
    // Get fresh user data
    const user = await database.findUserByEmail(decoded.email);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Revoke old refresh token by finding the matching one
    const userId = (decoded as any).userId;
    const userTokens = await database.getActiveRefreshTokensForUser(userId);
    
    for (const storedToken of userTokens) {
      if (await bcrypt.compare(refreshToken, storedToken.tokenHash)) {
        await database.revokeRefreshTokenById(storedToken.id);
        break;
      }
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user);
    
    // Clean user object to remove BigInt values
    const cleanUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType || user.account_type,
      tenantId: user.tenantId || user.tenant_id,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    return { user: cleanUser, tokens };
  }

  async revokeAllTokens(userId: string, isAdmin: boolean = false) {
    try {
      if (isAdmin) {
        // Handle admin token revocation if needed
        console.log('Revoking admin tokens for user:', userId);
      } else {
        await database.revokeAllUserTokens(userId);
      }
    } catch (error) {
      console.error('Error revoking tokens:', error);
    }
  }

  async loginUser(email: string, password: string) {
    const user = await database.findUserByEmail(email);
    
    if (!user) {
      // Use a generic error to prevent email enumeration
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verificar se o tenant está ativo - OTIMIZADO
    const tenantId = user.tenantId || user.tenant_id;
    if (tenantId) {
      const tenant = await database.getTenantById(tenantId);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      if (!tenant.isActive) {
        throw new Error('Renove Sua Conta ou Entre em contato com o Administrador do Sistema');
      }
    }

    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await database.updateUserLastLogin(user.id);

    const tokens = await this.generateTokens(user);
    
    // Clean user object to remove BigInt and password
    const cleanUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType || user.account_type,
      tenantId: user.tenantId || user.tenant_id,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    return { user: cleanUser, tokens };
  }

  async loginAdmin(email: string, password: string) {
    const admin = await database.findAdminByEmail(email);
    
    if (!admin) {
      throw new Error('Invalid admin credentials');
    }

    if (!admin.isActive) {
      throw new Error('Admin account is deactivated');
    }

    const isValidPassword = await this.verifyPassword(password, admin.password);
    if (!isValidPassword) {
      throw new Error('Invalid admin credentials');
    }

    // Update last login
    await database.updateAdminLastLogin(admin.id);

    const tokens = await this.generateTokens(admin);
    
    // Remove password from response
    const { password: _, ...adminWithoutPassword } = admin;
    
    return { user: adminWithoutPassword, tokens };
  }

  async registerUser(email: string, password: string, name: string, key: string) {
    console.log('=== STARTING USER REGISTRATION ===');
    console.log('Registration data:', { email, name, keyPreview: key.substring(0, 8) + '...' });
    
    // Validate registration key
    const validKeys = await database.findValidRegistrationKeys();
    console.log('Available registration keys:', validKeys.length);
    console.log('Looking for key:', key.substring(0, 8) + '...');
    
    let registrationKey = null;
    
    // Try to find a matching key by comparing the plain key with stored hashes
    for (const validKey of validKeys) {
      try {
        console.log('Comparing with key ID:', validKey.id, 'hash preview:', validKey.keyHash ? validKey.keyHash.substring(0, 10) + '...' : 'null');
        
        // Use the correct field name based on Prisma schema
        const keyHashField = validKey.keyHash;
        
        if (keyHashField && await bcrypt.compare(key, keyHashField)) {
          console.log('Key match found for ID:', validKey.id);
          registrationKey = validKey;
          break;
        }
      } catch (error) {
        console.error('Error comparing key hash for ID', validKey.id, ':', error);
        continue;
      }
    }

    if (!registrationKey) {
      console.log('Registration key not found. Provided key:', key.substring(0, 8) + '...');
      console.log('Available key hashes:', validKeys.map(k => ({ 
        id: k.id, 
        hashPreview: k.keyHash?.substring(0, 10) + '...' 
      })));
      throw new Error('Invalid or expired registration key');
    }

    console.log('Valid registration key found:', {
      id: registrationKey.id,
      tenantId: registrationKey.tenantId,
      accountType: registrationKey.accountType,
      usesLeft: registrationKey.usesLeft
    });

    // Verificar se tenantId está presente na chave de registro
    if (!registrationKey.tenantId) {
      console.error('Registration key without tenantId:', registrationKey.id);
      throw new Error('Invalid registration key: missing tenant association');
    }

    // Check if user already exists
    const existingUser = await database.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await this.hashPassword(password);
    
    // Use existing tenant (tenantId is now required) - OTIMIZADO
    const tenant = await database.getTenantById(registrationKey.tenantId);
    
    if (!tenant) {
      console.error('Associated tenant not found:', registrationKey.tenantId);
      throw new Error('Associated tenant not found');
    }

    if (!tenant.isActive) {
      console.error('Associated tenant is inactive:', registrationKey.tenantId);
      throw new Error('Cannot register user for inactive tenant');
    }

    console.log('Using tenant:', {
      id: tenant.id,
      name: tenant.name,
      isActive: tenant.isActive,
      maxUsers: tenant.maxUsers
    });

    // Create user with proper tenant association
    const userData = {
      email,
      password: hashedPassword,
      name,
      accountType: registrationKey.accountType,
      tenantId: tenant.id,
      isActive: true,
      mustChangePassword: false,
    };

    console.log('Creating user with data:', {
      email: userData.email,
      name: userData.name,
      accountType: userData.accountType,
      tenantId: userData.tenantId,
      tenantName: tenant.name
    });

    const user = await database.createUser(userData);
    
    console.log('User created successfully:', {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId || user.tenant_id,
      accountType: user.accountType || user.account_type,
      userObject: user
    });

    // Update registration key usage
    const currentUsedLogs = registrationKey.usedLogs;
    const usedLogsArray = currentUsedLogs ? (typeof currentUsedLogs === 'string' ? JSON.parse(currentUsedLogs) : currentUsedLogs) : [];
    
    await database.updateRegistrationKeyUsage(registrationKey.id, {
      usesLeft: registrationKey.usesLeft - 1,
      usedLogs: [
        ...usedLogsArray,
        {
          userId: user.id,
          email: user.email,
          usedAt: new Date().toISOString()
        }
      ]
    });

    const tokens = await this.generateTokens(user);
    
    // Clean user object to remove BigInt and password
    const cleanUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType || user.account_type,
      tenantId: user.tenantId || user.tenant_id,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    console.log('Registration completed successfully for:', {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      accountType: user.accountType
    });
    
    console.log('=== USER REGISTRATION COMPLETED ===');
    
    return { user: cleanUser, tokens, isNewTenant: false };
  }
}

export const authService = new AuthService();
