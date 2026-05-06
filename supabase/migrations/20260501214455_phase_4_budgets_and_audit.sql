-- 1. Metas e Orçamentos
CREATE TABLE public.monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month text UNIQUE NOT NULL, -- formato "YYYY-MM"
  revenue_target numeric NOT NULL DEFAULT 0,
  expense_limit numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read budgets" ON monthly_budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert budgets" ON monthly_budgets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update budgets" ON monthly_budgets FOR UPDATE TO authenticated USING (true);

-- 2. Audit Trail (Log de Atividades)
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  user_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_label text,
  changes jsonb,
  metadata jsonb
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logs" ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger de Auditoria
CREATE OR REPLACE FUNCTION public.log_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _user_id uuid;
  _user_email text;
  _changes jsonb;
  _entity_id uuid;
  _entity_label text;
BEGIN
  _user_id := auth.uid();
  SELECT email INTO _user_email FROM public.profiles WHERE id = _user_id;
  
  IF TG_OP = 'DELETE' THEN
    _entity_id := OLD.id;
    _entity_label := COALESCE(OLD.description, OLD.name, OLD.id::text);
  ELSE
    _entity_id := NEW.id;
    _entity_label := COALESCE(NEW.description, NEW.name, NEW.id::text);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    _changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    _changes := NULL;
  END IF;

  INSERT INTO public.activity_logs (user_id, user_email, action, entity_type, entity_id, entity_label, changes)
  VALUES (_user_id, _user_email, TG_OP, TG_TABLE_NAME, _entity_id, _entity_label, _changes);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION log_activity();
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON clients FOR EACH ROW EXECUTE FUNCTION log_activity();
