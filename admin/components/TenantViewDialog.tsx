import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Building,
  Users,
  Calendar,
  HardDrive,
  Activity,
  Settings,
  AlertTriangle,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  schemaName: string;
  planType: string;
  isActive: boolean;
  maxUsers: number;
  userCount: number;
  planExpiresAt?: string;
  createdAt: string;
  stats: {
    clients: number;
    projects: number;
    tasks: number;
    transactions: number;
    invoices: number;
  };
}

interface TenantViewDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantViewDialog({ tenant, open, onOpenChange }: TenantViewDialogProps) {
  if (!tenant) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  const isExpired = tenant.planExpiresAt && new Date(tenant.planExpiresAt) < new Date();
  const isExpiringSoon = tenant.planExpiresAt && 
    new Date(tenant.planExpiresAt) > new Date() &&
    new Date(tenant.planExpiresAt).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building className="h-8 w-8 text-blue-600" />
              <div>
                <DialogTitle className="text-xl">{tenant.name}</DialogTitle>
                <DialogDescription className="flex items-center space-x-2">
                  <span className="font-mono text-xs">{tenant.id}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getPlanBadgeColor(tenant.planType)}>
                {tenant.planType.toUpperCase()}
              </Badge>
              <Badge variant={tenant.isActive ? "default" : "destructive"}>
                {tenant.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {isExpired && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Expired
                </Badge>
              )}
              {isExpiringSoon && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Expiring Soon
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Configuration
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Schema Name:</span>
                  <span className="font-mono">{tenant.schemaName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Users:</span>
                  <span>{tenant.maxUsers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Users:</span>
                  <span className={tenant.userCount >= tenant.maxUsers ? 'text-red-600 font-medium' : ''}>
                    {tenant.userCount}/{tenant.maxUsers}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(tenant.createdAt)}</span>
                </div>
                {tenant.planExpiresAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan Expires:</span>
                    <span className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-yellow-600 font-medium' : ''}>
                      {formatDate(tenant.planExpiresAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Usage Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Clients:</span>
                  <span className="font-medium">{tenant.stats.clients}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Projects:</span>
                  <span className="font-medium">{tenant.stats.projects}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks:</span>
                  <span className="font-medium">{tenant.stats.tasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span className="font-medium">{tenant.stats.transactions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoices:</span>
                  <span className="font-medium">{tenant.stats.invoices}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Plan Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Plan Information</h3>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{tenant.planType.toUpperCase()}</div>
                  <div className="text-sm text-muted-foreground">Current Plan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{tenant.userCount}</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {tenant.stats.clients + tenant.stats.projects + tenant.stats.tasks}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <div className="space-x-2">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configure APIs
              </Button>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}