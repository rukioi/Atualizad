import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Key, Copy, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAdminApi } from '../hooks/useAdminApi';

interface RegistrationKeyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RegistrationKeyForm({ open, onOpenChange, onSuccess }: RegistrationKeyFormProps) {
  const { createRegistrationKey, getTenants } = useAdminApi();
  const [tenants, setTenants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    tenantId: '',
    accountType: 'SIMPLES',
    usesAllowed: 1,
    expiresAt: undefined as Date | undefined,
    singleUse: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      loadTenants();
    }
  }, [open]);

  const loadTenants = async () => {
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setIsLoading(true);
      const result = await createRegistrationKey({
        tenantId: formData.tenantId || undefined,
        accountType: formData.accountType as any,
        usesAllowed: formData.usesAllowed,
        expiresAt: formData.expiresAt,
        singleUse: formData.singleUse,
      });
      
      setGeneratedKey(result.key);
      setShowKey(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create registration key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedKey);
      alert('Registration key copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy key:', error);
    }
  };

  const handleClose = () => {
    setGeneratedKey('');
    setShowKey(false);
    setFormData({
      tenantId: '',
      accountType: 'SIMPLES',
      usesAllowed: 1,
      expiresAt: undefined,
      singleUse: true,
    });
    setError('');
    onOpenChange(false);
  };

  if (showKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              Registration Key Generated
            </DialogTitle>
            <DialogDescription>
              Save this key securely. It will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <Label className="text-sm font-medium text-green-800">Registration Key</Label>
              <div className="mt-2 p-3 bg-white border rounded font-mono text-sm break-all">
                {generatedKey}
              </div>
              <Button
                onClick={handleCopyKey}
                className="mt-3 w-full"
                variant="outline"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Account Type:</strong> {formData.accountType}</p>
              <p><strong>Uses Allowed:</strong> {formData.usesAllowed}</p>
              <p><strong>Single Use:</strong> {formData.singleUse ? 'Yes' : 'No'}</p>
              {formData.expiresAt && (
                <p><strong>Expires:</strong> {format(formData.expiresAt, 'PPP')}</p>
              )}
              {formData.tenantId && (
                <p><strong>Tenant:</strong> {tenants.find(t => t.id === formData.tenantId)?.name || 'Unknown'}</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> This key will not be displayed again. 
                Make sure to copy and store it securely before closing this dialog.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Generate Registration Key
          </DialogTitle>
          <DialogDescription>
            Create a new registration key for user signup.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Select value={formData.accountType} onValueChange={(value) => handleInputChange('accountType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIMPLES">Simple Account</SelectItem>
                <SelectItem value="COMPOSTA">Composite Account</SelectItem>
                <SelectItem value="GERENCIAL">Managerial Account</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantId">Assign to Tenant (Optional)</Label>
            <Select value={formData.tenantId} onValueChange={(value) => handleInputChange('tenantId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Create new tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Create New Tenant</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usesAllowed">Uses Allowed</Label>
              <Input
                id="usesAllowed"
                type="number"
                min="1"
                max="100"
                value={formData.usesAllowed}
                onChange={(e) => handleInputChange('usesAllowed', parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label>Single Use</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  checked={formData.singleUse}
                  onCheckedChange={(checked) => handleInputChange('singleUse', checked)}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.singleUse ? 'One time use' : 'Multiple uses'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expiration Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expiresAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expiresAt ? format(formData.expiresAt, "PPP") : "No expiration"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.expiresAt}
                  onSelect={(date) => handleInputChange('expiresAt', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Key'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}