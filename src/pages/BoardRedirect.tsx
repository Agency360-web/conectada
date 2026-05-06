import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Página de redirecionamento intermediária para usuários criacao/designer/membro.
 * Busca o departamento do usuário e redireciona para o board correspondente.
 */
export default function BoardRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    supabase
      .from("department_members")
      .select("department_id")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.department_id) {
          navigate(`/departamentos/${data.department_id}/board`, { replace: true });
        } else {
          // Sem departamento vinculado — mostra mensagem amigável
          navigate("/sem-acesso", { replace: true });
        }
      });
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Redirecionando para o seu quadro...</p>
    </div>
  );
}
