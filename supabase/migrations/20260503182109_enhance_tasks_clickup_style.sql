-- Adiciona novos campos à tabela de tarefas
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS estimated_time integer, -- Tempo estimado em minutos
ADD COLUMN IF NOT EXISTS tracked_time integer DEFAULT 0, -- Tempo gasto/rastreado em minutos
ADD COLUMN IF NOT EXISTS drive_link text; -- Link para a pasta do Drive do projeto

-- Tabela de junção para responsáveis (múltiplos usuários por tarefa)
CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total autenticado assignees" ON task_assignees FOR ALL TO authenticated USING (true);
