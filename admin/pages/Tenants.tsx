import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Building, Plus, Search, Eye, MoreHorizontal, AlertTriangle, Users, Settings, Trash2, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TenantForm } from '../components/TenantForm';
import { TenantViewDialog } from '../components/TenantViewDialog';
import { useAdminApi, Tenant } from '../hooks/useAdminApi';
import { ApiConfigModal } from '../components/ApiConfigModal';

export function AdminTenants() {
  const { getTenants, deleteTenant, toggleTenantStatus } = useAdminApi();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApiConfigModal, setShowApiConfigModal] = useState(false);
  const [apiConfigTenant, setApiConfigTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    // Filter tenants based on search term
    const filtered = tenants.filter(tenant =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTenants(filtered);
  }, [tenants, searchTerm]);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear previous errors
      const data = await getTenants();
      setTenants(data);
      setFilteredTenants(data); // Initialize filteredTenants with all tenants
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteTenant(tenantId);
      await loadTenants(); // Reload tenants after deletion
    } catch (err) {
      console.error('Failed to delete tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
      alert('Failed to delete tenant');
    }
  };

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowViewDialog(true);
  };

  const handleConfigureApis = (tenant: Tenant) => {
    setApiConfigTenant(tenant);
    setShowApiConfigModal(true);
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    const newStatus = !tenant.isActive;
    const action = newStatus ? 'ativar' : 'desativar';
    
    if (!confirm(`Tem certeza que deseja ${action} o tenant "${tenant.name}"?\n\n${!newStatus ? 'ATENÇÃO: Todos os usuários deste tenant serão bloqueados e não conseguirão fazer login.' : 'Os usuários poderão fazer login normalmente.'}`)) {
      return;
    }

    try {
      setError(null);
      await toggleTenantStatus(tenant.id, newStatus);
      await loadTenants(); // Reload tenants
    } catch (err) {
      console.error('Failed to toggle tenant status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle tenant status');
    }
  };
  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'premium':
        return 'bg-blue-100 text-blue-800';
      case 'basic':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
            <p className="text-gray-600">
              Manage all tenants and their configurations
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Tenants ({filteredTenants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading tenants...</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No tenants found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tenant.name}</div>
                              <div className="text-sm text-muted-foreground font-mono">
                                {tenant.id}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPlanBadgeColor(tenant.planType)}>
                              {tenant.planType.toUpperCase()}
                            </Badge>
                            {tenant.planExpiresAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Expires: {new Date(tenant.planExpiresAt).toLocaleDateString()}
                                {isExpiringSoon(tenant.planExpiresAt) && (
                                  <AlertTriangle className="h-3 w-3 inline ml-1 text-yellow-500" />
                                )}
                                {isExpired(tenant.planExpiresAt) && (
                                  <AlertTriangle className="h-3 w-3 inline ml-1 text-red-500" />
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{tenant.userCount}/{tenant.maxUsers}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              <div>👥 {tenant.stats.clients} clients</div>
                              <div>📁 {tenant.stats.projects} projects</div>
                              <div>✅ {tenant.stats.tasks} tasks</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={tenant.isActive ? "default" : "destructive"}
                              className={tenant.isActive ? "bg-green-100 text-green-800" : ""}
                            >
                              {tenant.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <div className="mt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(tenant)}
                                className={tenant.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                              >
                                {tenant.isActive ? '🔒 Desativar' : '✅ Ativar'}
                              </Button>
                            </div>
                            {isExpired(tenant.planExpiresAt) && (
                              <Badge variant="destructive" className="ml-1">
                                Expired
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(tenant.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewTenant(tenant)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleConfigureApis(tenant)}>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Configure APIs
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTenant(tenant.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <TenantForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onSuccess={loadTenants}
        />

        <TenantViewDialog
          tenant={selectedTenant}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
        />

        <ApiConfigModal
          tenant={apiConfigTenant}
          open={showApiConfigModal}
          onOpenChange={setShowApiConfigModal}
          onSuccess={loadTenants}
        />
      </div>
    </AdminLayout>
  );
}