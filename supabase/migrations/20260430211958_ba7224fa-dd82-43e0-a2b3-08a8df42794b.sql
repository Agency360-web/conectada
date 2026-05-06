
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'financeiro', 'viewer');
CREATE TYPE public.transaction_type AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE public.transaction_status AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE public.billing_cycle AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY');
CREATE TYPE public.subscription_status AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED');

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================
-- USER ROLES (separate table — security best practice)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- helper: any of (admin OR financeiro)
CREATE OR REPLACE FUNCTION public.can_write(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','financeiro')
  )
$$;

-- =========================================
-- CLIENTS
-- =========================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  asaas_customer_id TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- =========================================
-- CATEGORIES
-- =========================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.transaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, type)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- =========================================
-- TRANSACTIONS
-- =========================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  type public.transaction_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  payment_date DATE,
  status public.transaction_status NOT NULL DEFAULT 'PENDING',
  asaas_payment_id TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_client ON public.transactions(client_id);
CREATE INDEX idx_transactions_due_date ON public.transactions(due_date);
CREATE INDEX idx_transactions_status ON public.transactions(status);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- =========================================
-- CLIENT COSTS
-- =========================================
CREATE TABLE public.client_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount_allocated NUMERIC(14,2) NOT NULL CHECK (amount_allocated >= 0),
  description TEXT NOT NULL,
  cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_costs_client ON public.client_costs(client_id);
ALTER TABLE public.client_costs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- SUBSCRIPTIONS
-- =========================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  asaas_subscription_id TEXT,
  description TEXT,
  value NUMERIC(14,2) NOT NULL CHECK (value >= 0),
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'MONTHLY',
  next_due_date DATE,
  status public.subscription_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- =========================================
-- updated_at trigger
-- =========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- New user trigger: create profile + assign role
-- First user becomes admin; subsequent users default to viewer
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- RLS POLICIES
-- =========================================

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- clients
CREATE POLICY "Authenticated read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writers insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Writers update clients" ON public.clients FOR UPDATE TO authenticated USING (public.can_write(auth.uid()));
CREATE POLICY "Admins delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- categories
CREATE POLICY "Authenticated read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writers insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Writers update categories" ON public.categories FOR UPDATE TO authenticated USING (public.can_write(auth.uid()));
CREATE POLICY "Admins delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- transactions
CREATE POLICY "Authenticated read transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writers insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Writers update transactions" ON public.transactions FOR UPDATE TO authenticated USING (public.can_write(auth.uid()));
CREATE POLICY "Admins delete transactions" ON public.transactions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- client_costs
CREATE POLICY "Authenticated read client_costs" ON public.client_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writers insert client_costs" ON public.client_costs FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Writers update client_costs" ON public.client_costs FOR UPDATE TO authenticated USING (public.can_write(auth.uid()));
CREATE POLICY "Admins delete client_costs" ON public.client_costs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions
CREATE POLICY "Authenticated read subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Writers insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()));
CREATE POLICY "Writers update subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (public.can_write(auth.uid()));
CREATE POLICY "Admins delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed common categories
INSERT INTO public.categories (name, type) VALUES
  ('Mensalidade', 'INCOME'),
  ('Projeto Avulso', 'INCOME'),
  ('Tráfego Pago', 'EXPENSE'),
  ('Hospedagem', 'EXPENSE'),
  ('Freelancer', 'EXPENSE'),
  ('Ferramentas/SaaS', 'EXPENSE'),
  ('Salários', 'EXPENSE'),
  ('Outros', 'EXPENSE')
ON CONFLICT DO NOTHING;
