import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAccountTypes?: ('SIMPLES' | 'COMPOSTA' | 'GERENCIAL')[];
}

export function ProtectedRoute({ children, requiredAccountTypes }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If account type restriction exists and user doesn't have required access
  if (requiredAccountTypes && user?.accountType) {
    const hasAccess = requiredAccountTypes.includes(user.accountType as any);
    
    if (!hasAccess) {
      console.log('User does not have required account type access:', {
        userAccountType: user.accountType,
        requiredTypes: requiredAccountTypes
      });
      return <Navigate to="/acesso-negado" replace />;
    }
  }

  console.log('Protected route access granted for user:', user?.email);
  return <>{children}</>;
}
