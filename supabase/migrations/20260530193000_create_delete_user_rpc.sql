-- Criar função RPC para excluir usuários de forma segura
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar se o usuário que está executando é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir usuários.';
  END IF;

  -- Impedir que o admin exclua a si mesmo
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta.';
  END IF;

  -- Deletar da tabela auth.users. 
  -- Devido ao ON DELETE CASCADE nas chaves estrangeiras de profiles e user_roles,
  -- isso removerá automaticamente o perfil e os papéis do usuário.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
