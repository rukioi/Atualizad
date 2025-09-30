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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Key,
  Calendar,
  User,
  Globe,
} from 'lucide-react';

interface RegistrationKey {
  id: string;
  accountType: string;
  usesAllowed: number;
  usesLeft: number;
  singleUse: boolean;
  expiresAt?: string;
  revoked: boolean;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
  };
  usageCount: number;
}

interface KeyUsageDialogProps {
  registrationKey: RegistrationKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyUsageDialog({ registrationKey, open, onOpenChange }: KeyUsageDialogProps) {
  if (!registrationKey) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccountTypeBadge = (accountType: string) => {
    const colors = {
      SIMPLES: 'bg-blue-100 text-blue-800',
      COMPOSTA: 'bg-yellow-100 text-yellow-800',
      GERENCIAL: 'bg-purple-100 text-purple-800',
    };
    return colors[accountType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Mock usage logs - in real implementation, this would come from the API
  const usageLogs = [
    {
      email: 'user@example.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      usedAt: '2025-01-28T10:30:00Z',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Registration Key Usage
          </DialogTitle>
          <DialogDescription>
            Detailed usage information for registration key
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Key Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Key ID:</span>
                  <span className="font-mono">{registrationKey.id.substring(0, 16)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Account Type:</span>
                  <Badge className={getAccountTypeBadge(registrationKey.accountType)}>
                    {registrationKey.accountType}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uses:</span>
                  <span>{registrationKey.usageCount}/{registrationKey.usesAllowed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Single Use:</span>
                  <span>{registrationKey.singleUse ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={registrationKey.revoked ? "destructive" : "default"}>
                    {registrationKey.revoked ? 'Revoked' : 'Active'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tenant Information</h3>
              <div className="space-y-3">
                {registrationKey.tenant ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tenant Name:</span>
                      <span className="font-medium">{registrationKey.tenant.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tenant ID:</span>
                      <span className="font-mono text-xs">{registrationKey.tenant.id}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Will create new tenant when used
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(registrationKey.createdAt)}</span>
                </div>
                {registrationKey.expiresAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className={new Date(registrationKey.expiresAt) < new Date() ? 'text-red-600' : ''}>
                      {formatDate(registrationKey.expiresAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Usage History */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Usage History</h3>
            {usageLogs.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>User Agent</TableHead>
                      <TableHead>Used At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{log.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{log.ipAddress}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground truncate max-w-xs">
                            {log.userAgent}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(log.usedAt)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>This key has not been used yet</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}