-- 1. Departamentos e Membros
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.department_members (
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('manager', 'member')) DEFAULT 'member',
  PRIMARY KEY (department_id, user_id)
);

-- Helper function para RLS
CREATE OR REPLACE FUNCTION public.is_department_member(dept_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.department_members 
    WHERE department_id = dept_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Colunas do Kanban e Labels
CREATE TABLE public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.task_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL -- ex: '#ef4444' ou 'bg-red-500'
);

-- 3. Tarefas (Tasks)
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  column_id uuid REFERENCES public.board_columns(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL, -- Vínculo com cliente
  title text NOT NULL,
  description text,
  priority text CHECK (priority IN ('URGENT', 'HIGH', 'NORMAL', 'LOW')) DEFAULT 'NORMAL',
  due_date date,
  position integer NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Associações da Tarefa (Assignees, Labels, Subtasks, Comments)
CREATE TABLE public.task_assignees (
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE public.task_label_assignments (
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id uuid REFERENCES public.task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

CREATE TABLE public.task_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  position integer NOT NULL
);

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. RLS Basico
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso de departamentos" ON departments FOR ALL TO authenticated USING (is_department_member(id));
CREATE POLICY "Acesso de membros" ON department_members FOR ALL TO authenticated USING (is_department_member(department_id));
CREATE POLICY "Acesso de colunas" ON board_columns FOR ALL TO authenticated USING (is_department_member(department_id));
CREATE POLICY "Acesso de tarefas" ON tasks FOR ALL TO authenticated USING (is_department_member(department_id));
CREATE POLICY "Acesso de subtasks" ON task_subtasks FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND is_department_member(department_id))
);
CREATE POLICY "Acesso de comentários" ON task_comments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND is_department_member(department_id))
);

-- 6. Trigger de Audit Log para Tarefas
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION log_activity();
