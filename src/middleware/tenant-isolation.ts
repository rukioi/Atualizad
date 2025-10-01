
import { Request, Response, NextFunction } from 'express';

interface TenantRequest extends Request {
  user?: any;
  tenant?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  tenantDB?: any;
}

export const validateTenantAccess = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin users bypass tenant validation
    if (user.role === 'admin' || user.role === 'super_admin') {
      return next();
    }

    // Regular users must have tenantId
    if (!user.tenantId) {
      console.error('User without tenantId attempting access:', user.userId);
      return res.status(403).json({ 
        error: 'Access denied: Invalid user tenant association' 
      });
    }

    // Verify tenant exists and is active
    const { database } = await import('../config/database');
    const tenants = await database.getAllTenants();
    const tenant = tenants.rows.find((t: any) => t.id === user.tenantId);
    
    if (!tenant) {
      console.error('Tenant not found:', user.tenantId);
      return res.status(403).json({ 
        error: 'Access denied: Tenant not found' 
      });
    }
    
    if (!tenant.isActive) {
      console.error('Inactive tenant access attempt:', user.tenantId);
      return res.status(403).json({ 
        error: 'Access denied: Tenant is inactive' 
      });
    }

    // Add tenant info to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      isActive: tenant.isActive
    };

    console.log('Tenant access validated:', {
      userId: user?.userId || user?.id,
      tenantId: tenant.id,
      tenantName: tenant.name,
      accountType: user.accountType
    });

    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during tenant validation' 
    });
  }
};

export const ensureTenantIsolation = (allowedAccountTypes?: string[]) => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    // Skip for admin users
    if (user.role === 'admin' || user.role === 'super_admin') {
      return next();
    }

    // Check account type permissions if specified
    if (allowedAccountTypes && !allowedAccountTypes.includes(user.accountType)) {
      console.error('Insufficient permissions for account type:', {
        userId: user.userId,
        accountType: user.accountType,
        requiredTypes: allowedAccountTypes
      });
      
      return res.status(403).json({ 
        error: 'Access denied: Insufficient account permissions',
        requiredAccountTypes: allowedAccountTypes,
        currentAccountType: user.accountType
      });
    }

    next();
  };
};
