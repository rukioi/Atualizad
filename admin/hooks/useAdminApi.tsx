import { useState, useCallback } from 'react';

export interface GlobalMetrics {
  tenants: {
    total: number;
    active: number;
  };
  users: {
    total: number;
  };
  registrationKeys: Array<{
    accountType: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    level: string;
    message: string;
    tenantName?: string;
    createdAt: string;
  }>;
}

export interface Tenant {
  id: string;
  name: string;
  schemaName: string;
  planType: string;
  isActive: boolean;
  maxUsers: number;
  userCount: number;
  createdAt: string;
  stats: {
    clients: number;
    projects: number;
    tasks: number;
    transactions: number;
    invoices: number;
  };
}

export interface RegistrationKey {
  id: string;
  key?: string;
  accountType: string;
  usesAllowed: number;
  usesLeft: number;
  expiresAt?: string;
  createdAt: string;
  revoked: boolean;
  tenant?: { id: string };
  usageCount: number;
  metadata?: any;
}

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('admin_access_token');

  const response = await fetch(`/api/admin${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Request failed';

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export function useAdminApi() {
  const [isLoading, setIsLoading] = useState(false);

  const getGlobalMetrics = async (): Promise<GlobalMetrics> => {
    setIsLoading(true);
    try {
      const data = await apiCall('/metrics');
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const getTenants = async (): Promise<Tenant[]> => {
    setIsLoading(true);
    try {
      const data = await apiCall('/tenants');
      return data.tenants || [];
    } finally {
      setIsLoading(false);
    }
  };

  const createTenant = async (tenantData: {
    name: string;
    planType: string;
    maxUsers: number;
    maxStorage: number;
    planExpiresAt?: Date;
  }): Promise<Tenant> => {
    setIsLoading(true);
    try {
      const data = await apiCall('/tenants', {
        method: 'POST',
        body: JSON.stringify(tenantData),
      });
      return data.tenant;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTenant = async (tenantId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await apiCall(`/tenants/${tenantId}`, {
        method: 'DELETE',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTenant = async (tenantId: string, updateData: any): Promise<Tenant> => {
    setIsLoading(true);
    try {
      const data = await apiCall(`/tenants/${tenantId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return data.tenant;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTenantStatus = async (tenantId: string, isActive: boolean): Promise<Tenant> => {
    setIsLoading(true);
    try {
      const data = await apiCall(`/tenants/${tenantId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      return data.tenant;
    } finally {
      setIsLoading(false);
    }
  };

  const getRegistrationKeys = useCallback(async () => {
    try {
      const response = await apiCall('/keys');
      return response.keys || [];
    } catch (error) {
      console.error('Error getting registration keys:', error);
      throw error;
    }
  }, []);

  const createRegistrationKey = async (keyData: {
    accountType: string;
    tenantId?: string;
    usesAllowed?: number;
    expiresAt?: Date;
    singleUse?: boolean;
  }): Promise<{ key: string }> => {
    setIsLoading(true);

    console.log('Creating registration key with data:', keyData);

    const response = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        accountType: keyData.accountType,
        tenantId: keyData.tenantId,
        usesAllowed: keyData.usesAllowed || 1,
        singleUse: keyData.singleUse ?? true,
        expiresAt: keyData.expiresAt?.toISOString(),
      }),
    });

    console.log('Create key response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create key error response:', errorText);

      try {
        const error = JSON.parse(errorText);
        throw new Error(error.message || error.error || 'Failed to create registration key');
      } catch (parseError) {
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('Registration key created successfully:', result);

    // Return the key from the correct location in the response
    return {
      key: result.key || result.data?.key || 'Key not found in response'
    };
  };


  const revokeRegistrationKey = useCallback(async (keyId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await apiCall(`/keys/${keyId}/revoke`, {
        method: 'PATCH',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteRegistrationKey = useCallback(async (keyId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await apiCall(`/keys/${keyId}`, {
        method: 'DELETE',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to get the token, assuming it's stored similarly to admin_access_token
  // This should be defined or imported if it's not globally available
  const getToken = (): string | null => {
    return localStorage.getItem('admin_access_token');
  };


  return {
    isLoading,
    getGlobalMetrics,
    getTenants,
    createTenant,
    deleteTenant,
    updateTenant,
    toggleTenantStatus,
    getRegistrationKeys,
    createRegistrationKey,
    revokeRegistrationKey,
    deleteRegistrationKey,
  };
}