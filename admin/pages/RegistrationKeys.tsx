
import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useAdminApi } from '../hooks/useAdminApi';

interface RegistrationKey {
  id: string;
  key: string;
  accountType: string;
  isUsed: boolean;
  isRevoked: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export function AdminRegistrationKeys() {
  const { getRegistrationKeys, createRegistrationKey, revokeRegistrationKey, isLoading } = useAdminApi();
  const [keys, setKeys] = useState<RegistrationKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setError(null);
      setIsLoadingKeys(true);
      
      const data = await getRegistrationKeys();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setKeys(data);
      } else if (data && Array.isArray(data.keys)) {
        setKeys(data.keys);
      } else {
        console.warn('Unexpected data format:', data);
        setKeys([]);
      }
    } catch (err) {
      console.error('Failed to load keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load registration keys');
      setKeys([]);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleCreateKey = async (accountType: string) => {
    try {
      setError(null);
      const newKey = await createRegistrationKey({
        accountType,
        usesAllowed: 1,
        singleUse: true,
      });
      setSuccess(`Registration key created successfully: ${newKey.key}`);
      setIsCreateDialogOpen(false);
      await loadKeys();
    } catch (err) {
      console.error('Failed to create key:', err);
      setError(err instanceof Error ? err.message : 'Failed to create registration key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this registration key?')) {
      return;
    }

    try {
      setError(null);
      await revokeRegistrationKey(keyId);
      setSuccess('Registration key revoked successfully');
      await loadKeys();
    } catch (err) {
      console.error('Failed to revoke key:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke registration key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Registration key copied to clipboard');
    setTimeout(() => setSuccess(null), 3000);
  };

  const getStatusBadge = (key: RegistrationKey) => {
    if (key.isRevoked) {
      return <Badge variant="destructive" className="flex items-center"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
    }
    if (key.isUsed) {
      return <Badge variant="secondary" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Used</Badge>;
    }
    return <Badge variant="default" className="flex items-center"><Key className="h-3 w-3 mr-1" />Active</Badge>;
  };

  const getAccountTypeBadge = (accountType: string) => {
    const colors = {
      SIMPLES: 'bg-green-100 text-green-800',
      COMPOSTA: 'bg-blue-100 text-blue-800',
      GERENCIAL: 'bg-purple-100 text-purple-800',
    };
    return (
      <Badge className={colors[accountType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {accountType}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registration Keys</h1>
            <p className="text-gray-600">
              Manage registration keys for new accounts
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Registration Key</DialogTitle>
                <DialogDescription>
                  Choose the account type for the new registration key
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button
                  onClick={() => handleCreateKey('SIMPLES')}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={isLoading}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Conta Simples
                </Button>
                <Button
                  onClick={() => handleCreateKey('COMPOSTA')}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={isLoading}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Conta Composta
                </Button>
                <Button
                  onClick={() => handleCreateKey('GERENCIAL')}
                  className="w-full justify-start"
                  variant="outline"
                  disabled={isLoading}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Conta Gerencial
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerts */}
        {error && (
          <Alert className="border-red-500/50 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500/50 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-700">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Keys Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingKeys ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading registration keys...</p>
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Key className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No registration keys found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {key.key.substring(0, 8)}...{key.key.substring(-4)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(key.key)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getAccountTypeBadge(key.accountType)}</TableCell>
                      <TableCell>{getStatusBadge(key)}</TableCell>
                      <TableCell>
                        {key.usedBy ? (
                          <div>
                            <p className="text-sm font-medium">{key.usedBy}</p>
                            <p className="text-xs text-gray-500">
                              {key.usedAt ? new Date(key.usedAt).toLocaleDateString() : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not used</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(key.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!key.isUsed && !key.isRevoked && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokeKey(key.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
