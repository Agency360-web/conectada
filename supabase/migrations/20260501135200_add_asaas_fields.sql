-- =========================================
-- PASSO 1: Integração Asaas - Atualização do Banco de Dados
-- =========================================

-- 1. Criação do enum billing_type
CREATE TYPE public.billing_type AS ENUM ('BOLETO', 'PIX', 'CREDIT_CARD', 'UNDEFINED');

-- 2. Alteração na tabela transactions
ALTER TABLE public.transactions
  ADD COLUMN billing_type public.billing_type NOT NULL DEFAULT 'UNDEFINED',
  ADD COLUMN invoice_url TEXT,
  ADD COLUMN bank_slip_url TEXT,
  ADD COLUMN pix_qr_code TEXT,
  ADD COLUMN pix_qr_code_image TEXT;

-- 3. Alteração na tabela subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN billing_type public.billing_type NOT NULL DEFAULT 'PIX';
