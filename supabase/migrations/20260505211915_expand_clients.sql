-- Migration para expandir a tabela clients com dados empresariais, endereço e negociação
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS razao_social text,
ADD COLUMN IF NOT EXISTS nome_fantasia text,
ADD COLUMN IF NOT EXISTS responsavel_nome text,
-- Campos de Endereço
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS endereco_rua text,
ADD COLUMN IF NOT EXISTS endereco_numero text,
ADD COLUMN IF NOT EXISTS endereco_complemento text,
ADD COLUMN IF NOT EXISTS endereco_bairro text,
ADD COLUMN IF NOT EXISTS endereco_cidade text,
ADD COLUMN IF NOT EXISTS endereco_estado text,
-- Campos de Negociação
ADD COLUMN IF NOT EXISTS servicos_contratados text,
ADD COLUMN IF NOT EXISTS prazo_contrato text,
ADD COLUMN IF NOT EXISTS valor_total numeric(15, 2),
ADD COLUMN IF NOT EXISTS forma_pagamento text,
ADD COLUMN IF NOT EXISTS dia_vencimento integer,
ADD COLUMN IF NOT EXISTS observacoes text;
