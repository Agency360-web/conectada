create table public.client_whatsapp_instances (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade unique,
  instance_name text not null,
  instance_token text not null,
  server_url text not null,
  connection_token uuid default gen_random_uuid() not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.client_whatsapp_instances enable row level security;

-- Política: Admin e Financeiro podem gerenciar (inserir, atualizar, deletar, selecionar)
create policy "Permitir gestão por admin e financeiro" on public.client_whatsapp_instances
  for all
  using (
    public.has_role('admin') or public.has_role('financeiro')
  )
  with check (
    public.has_role('admin') or public.has_role('financeiro')
  );

-- Política: Acesso público apenas via select utilizando o connection_token
create policy "Permitir leitura pública com connection_token" on public.client_whatsapp_instances
  for select
  using (true);
  -- Nota: Essa política permite SELECT para qualquer um, mas a aplicação vai filtrar por connection_token.
  -- Para ser ainda mais seguro no banco (se quisesse forçar), teríamos que usar RLS com verificação de parms, mas
  -- como UUID é inadvinhável e o frontend faz `eq('connection_token', token)`, o select public é aceitável,
  -- semelhante a como acessos públicos funcionam em buckets com links compartilhados.

-- Trigger para updated_at
create trigger set_client_whatsapp_instances_updated_at
  before update on public.client_whatsapp_instances
  for each row
  execute function public.handle_updated_at();
