-- Migration para adicionar dados de contato do cliente na tabela de transações
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT;

COMMENT ON COLUMN public.transactions.customer_name IS 'Nome do cliente no momento da transação';
COMMENT ON COLUMN public.transactions.customer_phone IS 'Telefone do cliente no momento da transação';
COMMENT ON COLUMN public.transactions.customer_email IS 'E-mail do cliente no momento da transação';
