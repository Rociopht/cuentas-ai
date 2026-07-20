
-- =========================================================
-- CUENTAS AI · Schema
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROPERTIES
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  property_type text NOT NULL DEFAULT 'multi_unit',
  address text,
  city text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.properties(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own properties" ON public.properties FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER properties_updated BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- UNITS
CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit_type text NOT NULL DEFAULT 'habitacion',
  status text NOT NULL DEFAULT 'available',
  due_day int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.units(property_id);
CREATE INDEX ON public.units(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own units" ON public.units FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER units_updated BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TENANTS
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document_number text,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tenants(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tenants" ON public.tenants FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER tenants_updated BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONTRACTS
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date,
  rent_amount numeric(12,2) NOT NULL,
  deposit_amount numeric(12,2),
  guarantee_amount numeric(12,2),
  special_conditions text,
  status text NOT NULL DEFAULT 'active',
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.contracts(unit_id);
CREATE INDEX ON public.contracts(tenant_id);
CREATE INDEX ON public.contracts(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contracts" ON public.contracts FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CHARGES
CREATE TABLE public.charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  concept text NOT NULL DEFAULT 'Alquiler',
  period_month int NOT NULL,
  period_year int NOT NULL,
  amount_expected numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.charges(owner_id);
CREATE INDEX ON public.charges(unit_id);
CREATE INDEX ON public.charges(due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charges TO authenticated;
GRANT ALL ON public.charges TO service_role;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own charges" ON public.charges FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER charges_updated BEFORE UPDATE ON public.charges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'yape',
  proof_url text,
  status text NOT NULL DEFAULT 'pending_review',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments(owner_id);
CREATE INDEX ON public.payments(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.payments FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAYMENT ALLOCATIONS
CREATE TABLE public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  charge_id uuid NOT NULL REFERENCES public.charges(id) ON DELETE CASCADE,
  amount_allocated numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payment_allocations(payment_id);
CREATE INDEX ON public.payment_allocations(charge_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_allocations TO authenticated;
GRANT ALL ON public.payment_allocations TO service_role;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own allocations" ON public.payment_allocations FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  category text NOT NULL,
  amount numeric(12,2) NOT NULL,
  expense_date date NOT NULL,
  description text,
  receipt_url text,
  recurrence_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.expenses(owner_id);
CREATE INDEX ON public.expenses(property_id);
CREATE INDEX ON public.expenses(expense_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own expenses" ON public.expenses FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ACTIVITY LOG
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.activity_log(owner_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.activity_log FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Helper: charge status based on allocations
CREATE OR REPLACE FUNCTION public.recalc_charge_status(_charge_id uuid) RETURNS void AS $$
DECLARE
  _allocated numeric;
  _expected numeric;
  _due date;
BEGIN
  SELECT amount_expected, due_date INTO _expected, _due FROM public.charges WHERE id = _charge_id;
  SELECT COALESCE(SUM(amount_allocated),0) INTO _allocated FROM public.payment_allocations WHERE charge_id = _charge_id;
  UPDATE public.charges SET status = CASE
    WHEN _allocated >= _expected THEN 'paid'
    WHEN _allocated > 0 AND _due < CURRENT_DATE THEN 'overdue'
    WHEN _allocated > 0 THEN 'partial'
    WHEN _due < CURRENT_DATE THEN 'overdue'
    ELSE 'pending'
  END WHERE id = _charge_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.trg_recalc_charge_from_alloc() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_charge_status(OLD.charge_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_charge_status(NEW.charge_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER alloc_recalc AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_charge_from_alloc();

-- Auto profile on signup + seed demo data
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  _uid uuid := NEW.id;
  _p1 uuid := gen_random_uuid();
  _p2 uuid := gen_random_uuid();
  _p3 uuid := gen_random_uuid();
  _u_id uuid;
  _t_id uuid;
  _c_id uuid;
  _pay_id uuid;
  _ch_id uuid;
  _today date := CURRENT_DATE;
  _month int := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  _year int := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  _pm int; _py int;
BEGIN
  INSERT INTO public.profiles(id, full_name, email)
  VALUES (_uid, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);

  -- ============ PROPIEDAD 1: Rentas Miraflores (8 habitaciones) ============
  INSERT INTO public.properties(id, owner_id, name, property_type, address, city)
  VALUES (_p1, _uid, 'Rentas Miraflores', 'multi_unit', 'Av. Larco 456', 'Lima');

  -- Habitaciones 1-6 alquiladas, 7-8 disponibles
  FOR i IN 1..8 LOOP
    _u_id := gen_random_uuid();
    INSERT INTO public.units(id, owner_id, property_id, name, unit_type, status, due_day)
    VALUES (_u_id, _uid, _p1, 'Habitación ' || i, 'habitacion',
            CASE WHEN i <= 6 THEN 'occupied' ELSE 'available' END,
            CASE WHEN i % 2 = 0 THEN 5 ELSE 1 END);

    IF i <= 6 THEN
      _t_id := gen_random_uuid();
      INSERT INTO public.tenants(id, owner_id, full_name, phone)
      VALUES (_t_id, _uid,
        CASE i
          WHEN 1 THEN 'María Fernández'
          WHEN 2 THEN 'Carlos Ramos'
          WHEN 3 THEN 'Lucía Chávez'
          WHEN 4 THEN 'Diego Salazar'
          WHEN 5 THEN 'Andrea Vega'
          WHEN 6 THEN 'José Quispe'
        END,
        '+51 9' || (10000000 + i*1234)::text);

      _c_id := gen_random_uuid();
      INSERT INTO public.contracts(id, owner_id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount)
      VALUES (_c_id, _uid, _u_id, _t_id, _today - (interval '1 month' * (6+i)), _today + interval '6 months',
              300 + i*20, 300 + i*20);

      -- Generar cobros últimos 3 meses + este mes
      FOR k IN 0..3 LOOP
        _pm := ((_month - k - 1 + 12) % 12) + 1;
        _py := _year - CASE WHEN (_month - k) < 1 THEN 1 ELSE 0 END;
        _ch_id := gen_random_uuid();
        INSERT INTO public.charges(id, owner_id, unit_id, contract_id, tenant_id, concept, period_month, period_year, amount_expected, due_date, status)
        VALUES (_ch_id, _uid, _u_id, _c_id, _t_id, 'Alquiler', _pm, _py, 300 + i*20,
                make_date(_py, _pm, LEAST(CASE WHEN i%2=0 THEN 5 ELSE 1 END, 28)),
                'pending');

        -- Pagar la mayoría de meses anteriores; dejar algunos pendientes este mes
        IF k > 0 OR i <= 4 THEN
          _pay_id := gen_random_uuid();
          -- Pago parcial para inquilino 3 en el mes actual
          IF k = 0 AND i = 3 THEN
            INSERT INTO public.payments(id, owner_id, tenant_id, unit_id, amount, payment_date, payment_method, status, notes)
            VALUES (_pay_id, _uid, _t_id, _u_id, (300+i*20)*0.6, _today - 3, 'yape', 'confirmed', 'Pago parcial');
            INSERT INTO public.payment_allocations(owner_id, payment_id, charge_id, amount_allocated)
            VALUES (_uid, _pay_id, _ch_id, (300+i*20)*0.6);
          ELSE
            INSERT INTO public.payments(id, owner_id, tenant_id, unit_id, amount, payment_date, payment_method, status)
            VALUES (_pay_id, _uid, _t_id, _u_id, 300+i*20, make_date(_py, _pm, 3), 'yape', 'confirmed');
            INSERT INTO public.payment_allocations(owner_id, payment_id, charge_id, amount_allocated)
            VALUES (_uid, _pay_id, _ch_id, 300+i*20);
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Gastos propiedad 1
  INSERT INTO public.expenses(owner_id, property_id, category, amount, expense_date, description, recurrence_type) VALUES
    (_uid, _p1, 'Luz', 285.00, _today - 5, 'Recibo Enel', 'monthly'),
    (_uid, _p1, 'Agua', 120.00, _today - 8, 'Recibo Sedapal', 'monthly'),
    (_uid, _p1, 'Internet', 89.00, _today - 12, 'Movistar Fibra', 'monthly'),
    (_uid, _p1, 'Mantenimiento', 350.00, _today - 15, 'Limpieza mensual áreas comunes', 'monthly'),
    (_uid, _p1, 'Reparaciones', 180.00, _today - 20, 'Reparación caño Habitación 4', NULL);

  -- ============ PROPIEDAD 2: Edificio San Isidro (4 deptos) ============
  INSERT INTO public.properties(id, owner_id, name, property_type, address, city)
  VALUES (_p2, _uid, 'Edificio San Isidro', 'multi_unit', 'Calle Los Robles 210', 'Lima');

  FOR i IN 1..4 LOOP
    _u_id := gen_random_uuid();
    INSERT INTO public.units(id, owner_id, property_id, name, unit_type, status, due_day)
    VALUES (_u_id, _uid, _p2, 'Depto ' || i || CASE WHEN i=1 THEN 'A' WHEN i=2 THEN 'B' WHEN i=3 THEN 'C' ELSE 'D' END,
            'departamento',
            CASE WHEN i <= 3 THEN 'occupied' ELSE 'available' END, 1);

    IF i <= 3 THEN
      _t_id := gen_random_uuid();
      INSERT INTO public.tenants(id, owner_id, full_name, phone)
      VALUES (_t_id, _uid,
        CASE i WHEN 1 THEN 'Familia Torres' WHEN 2 THEN 'Roberto Delgado' WHEN 3 THEN 'Patricia Núñez' END,
        '+51 998' || (100000 + i*777)::text);

      _c_id := gen_random_uuid();
      INSERT INTO public.contracts(id, owner_id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount)
      VALUES (_c_id, _uid, _u_id, _t_id, _today - interval '1 year', _today + interval '4 months',
              1200 + i*150, 1200 + i*150);

      FOR k IN 0..2 LOOP
        _pm := ((_month - k - 1 + 12) % 12) + 1;
        _py := _year - CASE WHEN (_month - k) < 1 THEN 1 ELSE 0 END;
        _ch_id := gen_random_uuid();
        INSERT INTO public.charges(id, owner_id, unit_id, contract_id, tenant_id, concept, period_month, period_year, amount_expected, due_date, status)
        VALUES (_ch_id, _uid, _u_id, _c_id, _t_id, 'Alquiler', _pm, _py, 1200+i*150,
                make_date(_py, _pm, 1), 'pending');

        IF k > 0 OR i <= 2 THEN
          _pay_id := gen_random_uuid();
          INSERT INTO public.payments(id, owner_id, tenant_id, unit_id, amount, payment_date, payment_method, status)
          VALUES (_pay_id, _uid, _t_id, _u_id, 1200+i*150, make_date(_py, _pm, 2), 'transferencia', 'confirmed');
          INSERT INTO public.payment_allocations(owner_id, payment_id, charge_id, amount_allocated)
          VALUES (_uid, _pay_id, _ch_id, 1200+i*150);
        END IF;
      END LOOP;

      -- Pago adelantado para Depto 1A: 2 meses futuros
      IF i = 1 THEN
        _pay_id := gen_random_uuid();
        INSERT INTO public.payments(id, owner_id, tenant_id, unit_id, amount, payment_date, payment_method, status, notes)
        VALUES (_pay_id, _uid, _t_id, _u_id, 2700, _today - 2, 'transferencia', 'confirmed', 'Pago adelantado 2 meses');

        FOR k IN 1..2 LOOP
          _pm := ((_month + k - 1) % 12) + 1;
          _py := _year + CASE WHEN (_month + k) > 12 THEN 1 ELSE 0 END;
          _ch_id := gen_random_uuid();
          INSERT INTO public.charges(id, owner_id, unit_id, contract_id, tenant_id, concept, period_month, period_year, amount_expected, due_date, status)
          VALUES (_ch_id, _uid, _u_id, _c_id, _t_id, 'Alquiler', _pm, _py, 1350, make_date(_py, _pm, 1), 'pending');
          INSERT INTO public.payment_allocations(owner_id, payment_id, charge_id, amount_allocated)
          VALUES (_uid, _pay_id, _ch_id, 1350);
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.expenses(owner_id, property_id, category, amount, expense_date, description, recurrence_type) VALUES
    (_uid, _p2, 'Luz', 420.00, _today - 4, 'Áreas comunes', 'monthly'),
    (_uid, _p2, 'Agua', 180.00, _today - 6, 'Cisterna', 'monthly'),
    (_uid, _p2, 'Mantenimiento', 500.00, _today - 10, 'Ascensor', 'monthly'),
    (_uid, _p2, 'Reparaciones', 890.00, _today - 25, 'Pintura fachada', NULL);

  -- ============ PROPIEDAD 3: Local Comercial Surco ============
  INSERT INTO public.properties(id, owner_id, name, property_type, address, city)
  VALUES (_p3, _uid, 'Local Surco', 'commercial', 'Av. Caminos del Inca 890', 'Lima');

  _u_id := gen_random_uuid();
  INSERT INTO public.units(id, owner_id, property_id, name, unit_type, status, due_day)
  VALUES (_u_id, _uid, _p3, 'Local Principal', 'local', 'occupied', 10);

  _t_id := gen_random_uuid();
  INSERT INTO public.tenants(id, owner_id, full_name, phone, email)
  VALUES (_t_id, _uid, 'Cafetería Grano Verde SAC', '+51 987654321', 'contacto@granoverde.pe');

  _c_id := gen_random_uuid();
  INSERT INTO public.contracts(id, owner_id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount, guarantee_amount)
  VALUES (_c_id, _uid, _u_id, _t_id, _today - interval '2 years', _today + interval '25 days',
          3500, 7000, 3500);

  FOR k IN 0..2 LOOP
    _pm := ((_month - k - 1 + 12) % 12) + 1;
    _py := _year - CASE WHEN (_month - k) < 1 THEN 1 ELSE 0 END;
    _ch_id := gen_random_uuid();
    INSERT INTO public.charges(id, owner_id, unit_id, contract_id, tenant_id, concept, period_month, period_year, amount_expected, due_date, status)
    VALUES (_ch_id, _uid, _u_id, _c_id, _t_id, 'Alquiler', _pm, _py, 3500, make_date(_py, _pm, 10), 'pending');

    IF k > 0 THEN
      _pay_id := gen_random_uuid();
      INSERT INTO public.payments(id, owner_id, tenant_id, unit_id, amount, payment_date, payment_method, status)
      VALUES (_pay_id, _uid, _t_id, _u_id, 3500, make_date(_py, _pm, 11), 'transferencia', 'confirmed');
      INSERT INTO public.payment_allocations(owner_id, payment_id, charge_id, amount_allocated)
      VALUES (_uid, _pay_id, _ch_id, 3500);
    END IF;
  END LOOP;

  -- Pago sin identificar (por revisar)
  INSERT INTO public.payments(owner_id, amount, payment_date, payment_method, status, notes)
  VALUES (_uid, 500, _today - 1, 'yape', 'pending_review', 'Yape recibido - no identifica remitente');

  INSERT INTO public.expenses(owner_id, property_id, category, amount, expense_date, description) VALUES
    (_uid, _p3, 'Luz', 380.00, _today - 3, 'Recibo Enel'),
    (_uid, _p3, 'Mantenimiento', 220.00, _today - 18, 'Limpieza vidrios');

  -- Recalcular status de todos los cobros
  UPDATE public.charges c SET status = CASE
    WHEN COALESCE((SELECT SUM(amount_allocated) FROM public.payment_allocations WHERE charge_id = c.id), 0) >= c.amount_expected THEN 'paid'
    WHEN COALESCE((SELECT SUM(amount_allocated) FROM public.payment_allocations WHERE charge_id = c.id), 0) > 0 AND c.due_date < CURRENT_DATE THEN 'overdue'
    WHEN COALESCE((SELECT SUM(amount_allocated) FROM public.payment_allocations WHERE charge_id = c.id), 0) > 0 THEN 'partial'
    WHEN c.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'pending'
  END WHERE c.owner_id = _uid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
