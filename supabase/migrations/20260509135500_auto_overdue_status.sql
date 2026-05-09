-- ========================================================
-- AUTOMAÇÃO DE STATUS VENCIDO (OVERDUE)
-- ========================================================

-- 1. Habilitar a extensão pg_cron se ainda não estiver habilitada
-- Nota: Em alguns projetos Supabase, isso precisa ser feito via Dashboard > Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Função para atualizar transações vencidas
-- Esta função busca tudo que está PENDING e com due_date passado e muda para OVERDUE
CREATE OR REPLACE FUNCTION public.check_overdue_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.transactions
  SET status = 'OVERDUE'
  WHERE status = 'PENDING'
    AND due_date < CURRENT_DATE;
END;
$$;

-- 3. Agendar a tarefa (Cron Job) para rodar todo dia às 00:01
-- Usamos 00:01 para garantir que o dia já mudou em todos os fusos configurados
SELECT cron.schedule(
  'daily-overdue-check',
  '1 0 * * *',
  'SELECT public.check_overdue_transactions()'
);
