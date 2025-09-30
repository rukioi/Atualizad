import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAccountTypes?: ('SIMPLES' | 'COMPOSTA' | 'GERENCIAL')[];
}

export function ProtectedRoute({ children, requiredAccountTypes }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If account type restriction exists and user doesn't have required access
  if (requiredAccountTypes && user?.accountType) {
    const hasAccess = requiredAccountTypes.includes(user.accountType as any);
    
    if (!hasAccess) {
      return <Navigate to="/acesso-negado" replace />;
    }
  }

  return <>{children}</>;
}
