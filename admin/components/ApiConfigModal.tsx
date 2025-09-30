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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare,
  Mail,
  CreditCard,
  Scale,
  Workflow,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface ApiConfig {
  id?: string;
  tenantId: string;
  hasWhatsappConfig: boolean;
  hasResendConfig: boolean;
  hasStripeConfig: boolean;
  hasCodiloConfig: boolean;
  hasN8nConfig: boolean;
  whatsappPhoneNumber?: string;
  settings: any;
  isActive: boolean;
}

interface Tenant {
  id: string;
  name: string;
  isActive: boolean;
}

interface ApiConfigModalProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApiConfigModal({ tenant, open, onOpenChange, onSuccess }: ApiConfigModalProps) {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [formData, setFormData] = useState({
    whatsappApiKey: '',
    whatsappPhoneNumber: '',
    resendApiKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    codiloApiKey: '',
    n8nWebhookUrl: '',
  });
  const [showSecrets, setShowSecrets] = useState({
    whatsapp: false,
    resend: false,
    stripe: false,
    codilo: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open && tenant) {
      loadApiConfig();
    }
  }, [open, tenant]);

  const loadApiConfig = async () => {
    if (!tenant) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/api-configs/${tenant.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      } else if (response.status === 404) {
        // No config exists yet
        setConfig(null);
      } else {
        throw new Error('Failed to load API configuration');
      }
    } catch (err) {
      console.error('Failed to load API config:', err);
      setError('Failed to load API configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant) return;

    try {
      setIsLoading(true);
      setError('');

      const method = config ? 'PUT' : 'POST';
      const url = config 
        ? `/api/admin/api-configs/${tenant.id}`
        : '/api/admin/api-configs';

      const payload = config 
        ? formData
        : { ...formData, tenantId: tenant.id };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_access_token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      setSuccess('API configuration saved successfully!');
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const toggleShowSecret = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Scale className="h-5 w-5 mr-2" />
            Configure APIs - {tenant.name}
          </DialogTitle>
          <DialogDescription>
            Configure external API integrations for this tenant
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500/50 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="whatsapp" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="whatsapp" className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center space-x-1">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center space-x-1">
              <CreditCard className="h-4 w-4" />
              <span>Payments</span>
            </TabsTrigger>
            <TabsTrigger value="legal" className="flex items-center space-x-1">
              <Scale className="h-4 w-4" />
              <span>Legal</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center space-x-1">
              <Workflow className="h-4 w-4" />
              <span>Automation</span>
            </TabsTrigger>
          </TabsList>

          {/* WhatsApp Configuration */}
          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
                    WhatsApp Business API
                  </div>
                  {config?.hasWhatsappConfig && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-api-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="whatsapp-api-key"
                      type={showSecrets.whatsapp ? 'text' : 'password'}
                      placeholder="Enter WhatsApp API key"
                      value={formData.whatsappApiKey}
                      onChange={(e) => handleInputChange('whatsappApiKey', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => toggleShowSecret('whatsapp')}
                    >
                      {showSecrets.whatsapp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp-phone">Phone Number</Label>
                  <Input
                    id="whatsapp-phone"
                    placeholder="+55 11 99999-9999"
                    value={formData.whatsappPhoneNumber}
                    onChange={(e) => handleInputChange('whatsappPhoneNumber', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Configuration */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-blue-600" />
                    Resend Email API
                  </div>
                  {config?.hasResendConfig && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resend-api-key">Resend API Key</Label>
                  <div className="relative">
                    <Input
                      id="resend-api-key"
                      type={showSecrets.resend ? 'text' : 'password'}
                      placeholder="re_..."
                      value={formData.resendApiKey}
                      onChange={(e) => handleInputChange('resendApiKey', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => toggleShowSecret('resend')}
                    >
                      {showSecrets.resend ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stripe Configuration */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
                    Stripe Payments
                  </div>
                  {config?.hasStripeConfig && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripe-secret">Secret Key</Label>
                  <div className="relative">
                    <Input
                      id="stripe-secret"
                      type={showSecrets.stripe ? 'text' : 'password'}
                      placeholder="sk_..."
                      value={formData.stripeSecretKey}
                      onChange={(e) => handleInputChange('stripeSecretKey', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => toggleShowSecret('stripe')}
                    >
                      {showSecrets.stripe ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook">Webhook Secret</Label>
                  <Input
                    id="stripe-webhook"
                    type="password"
                    placeholder="whsec_..."
                    value={formData.stripeWebhookSecret}
                    onChange={(e) => handleInputChange('stripeWebhookSecret', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal API Configuration */}
          <TabsContent value="legal">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Scale className="h-5 w-5 mr-2 text-indigo-600" />
                    Codilo Legal API
                  </div>
                  {config?.hasCodiloConfig && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codilo-api-key">Codilo API Key</Label>
                  <div className="relative">
                    <Input
                      id="codilo-api-key"
                      type={showSecrets.codilo ? 'text' : 'password'}
                      placeholder="Enter Codilo API key"
                      value={formData.codiloApiKey}
                      onChange={(e) => handleInputChange('codiloApiKey', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => toggleShowSecret('codilo')}
                    >
                      {showSecrets.codilo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Configuration */}
          <TabsContent value="automation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Workflow className="h-5 w-5 mr-2 text-orange-600" />
                    n8n Automation
                  </div>
                  {config?.hasN8nConfig && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="n8n-webhook">n8n Webhook URL</Label>
                  <Input
                    id="n8n-webhook"
                    type="url"
                    placeholder="https://your-n8n-instance.com/webhook/..."
                    value={formData.n8nWebhookUrl}
                    onChange={(e) => handleInputChange('n8nWebhookUrl', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}