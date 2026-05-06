-- 1. Tabela de Anexos
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'task', 'client', 'transaction'
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  content_type text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total autenticado anexos" ON attachments FOR ALL TO authenticated USING (true);

-- 2. Bucket de Storage (via SQL se permitido, senão o usuário cria manual)
-- Nota: O Supabase geralmente requer criação via Dashboard ou API, mas tentaremos via SQL
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
CREATE POLICY "Acesso autenticado ao bucket" ON storage.objects FOR ALL TO authenticated 
USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');
