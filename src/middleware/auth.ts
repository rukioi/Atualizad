
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { database } from '../config/database';
import { authService } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId?: string;
    accountType?: string;
    name: string;
    role?: string;
  };
  tenantId?: string;
}

export interface JWTPayload {
  userId: string;
  tenantId?: string;
  accountType?: string;
  email: string;
  name: string;
  role?: string;
  type: 'access' | 'refresh';
}

// Admin token authentication middleware
export const authenticateAdminToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  console.log('Admin auth attempt:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
  });

  if (!token) {
    return res.status(401).json({
      error: 'Admin access token required',
      code: 'ADMIN_AUTH_001'
    });
  }

  try {
    // Handle mock tokens for development
    if (token.startsWith('mock-admin-token')) {
      console.log('Using mock admin token for development');
      req.user = {
        id: 'admin-1',
        email: 'admin@legalsaas.com',
        name: 'Administrator',
        role: 'superadmin',
      };
      next();
      return;
    }

    const decoded = await authService.verifyAccessToken(token);
    console.log('Token decoded successfully:', { userId: decoded.userId, email: decoded.email, role: decoded.role });

    // Verify this is an admin user (has role)
    if (!decoded.role) {
      console.log('User has no admin role');
      return res.status(401).json({
        error: 'Admin access required',
        code: 'ADMIN_AUTH_002'
      });
    }

    // Add admin user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error('Admin token verification failed:', error);
    return res.status(403).json({
      error: 'Invalid admin token',
      code: 'ADMIN_AUTH_003',
      details: error instanceof Error ? error.message : 'Token verification failed',
      token_provided: !!token
    });
  }
};

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev-secret-change-in-production') as any;

    // Validar se o usuário tem tenantId (não é admin)
    if (!decoded.role && !decoded.tenantId) {
      console.error('Token without tenantId for regular user:', decoded.userId);
      return res.status(403).json({ error: 'Invalid token: missing tenant information' });
    }

    req.user = decoded;

    // Se não é admin, verificar tenant
    if (!decoded.role && decoded.tenantId) {
      const { database } = await import('../config/database');
      const tenants = await database.getAllTenants();
      const tenant = tenants.rows.find((t: any) => t.id === decoded.tenantId);

      if (!tenant) {
        console.error('Tenant not found for user:', decoded.userId, 'tenantId:', decoded.tenantId);
        return res.status(403).json({ error: 'Invalid tenant' });
      }

      if (!tenant.isActive) {
        console.error('Inactive tenant for user:', decoded.userId, 'tenantId:', decoded.tenantId);
        return res.status(403).json({ error: 'Tenant is inactive' });
      }

      req.tenantId = tenant.id; // Set tenantId on AuthenticatedRequest
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Authorization middleware for account types
export const requireAccountType = (allowedTypes: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedTypes.includes(req.user.accountType || '')) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedTypes,
        current: req.user.accountType,
        code: 'AUTH_004',
      });
    }

    next();
  };
};

// Tenant isolation middleware
export const tenantMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Use req.tenantId from authenticateToken
  if (!req.tenantId) {
    return res.status(403).json({
      error: 'Tenant not identified',
      code: 'TENANT_001'
    });
  }

  next();
};

// Middleware to block cash flow module access for SIMPLES accounts
export const requireCashFlowAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_001'
    });
  }

  // SIMPLES accounts don't have access to cash flow module
  if (req.user.accountType === 'SIMPLES') {
    return res.status(403).json({
      error: 'Access denied: Cash flow module requires COMPOSTA or GERENCIAL account',
      code: 'PERMISSION_DENIED',
      requiredAccountTypes: ['COMPOSTA', 'GERENCIAL'],
      currentAccountType: req.user.accountType,
    });
  }

  next();
};

// Middleware to block settings module access for SIMPLES and COMPOSTA accounts
export const requireSettingsAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_001'
    });
  }

  // Only GERENCIAL accounts have access to settings
  if (req.user.accountType !== 'GERENCIAL') {
    return res.status(403).json({
      error: 'Access denied: Settings module requires GERENCIAL account',
      code: 'PERMISSION_DENIED',
      requiredAccountTypes: ['GERENCIAL'],
      currentAccountType: req.user.accountType,
    });
  }

  next();
};
