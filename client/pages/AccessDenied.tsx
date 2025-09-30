import { Shield, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getAccountTypeLabel = (accountType?: string) => {
    switch (accountType) {
      case 'SIMPLES':
        return 'Conta Simples';
      case 'COMPOSTA':
        return 'Conta Composta';
      case 'GERENCIAL':
        return 'Conta Gerencial';
      default:
        return 'Tipo de conta desconhecido';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Shield className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Acesso Negado
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Você não tem permissão para acessar este módulo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Seu tipo de conta:</strong> {getAccountTypeLabel(user?.accountType)}
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              Este módulo requer um tipo de conta diferente. Entre em contato com o administrador do seu escritório para solicitar upgrade.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="w-full"
            >
              <Home className="mr-2 h-4 w-4" />
              Ir para Dashboard
            </Button>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-2">Tipos de Conta:</h4>
            <ul className="text-sm space-y-2 text-gray-600">
              <li>
                <strong>Simples:</strong> CRM, Projetos, Tarefas
              </li>
              <li>
                <strong>Composta:</strong> Todos os módulos exceto Configurações
              </li>
              <li>
                <strong>Gerencial:</strong> Acesso completo a todos os módulos
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
