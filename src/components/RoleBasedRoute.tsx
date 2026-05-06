import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "financeiro" | "criacao" | "membro" | "viewer" | "designer")[];
}

export function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const { session, loading, roles, isAdmin, isCriacao, isMembro } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Admin sempre tem acesso total
  if (isAdmin) {
    return <>{children}</>;
  }

  // Se a rota tem restrição de roles, checamos se o usuário tem a permissão
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some(role => roles.includes(role));
    if (!hasAccess) {
      // Criacao/Designer/Membro sem acesso → manda para o board deles
      if (isCriacao || isMembro) {
        return <Navigate to="/meu-board" replace />;
      }
      // Outros sem acesso → dashboard (financeiro etc)
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
