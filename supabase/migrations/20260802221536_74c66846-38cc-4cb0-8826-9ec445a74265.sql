ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS expense_type text NOT NULL DEFAULT 'variable',
  ADD COLUMN IF NOT EXISTS due_day integer,
  ADD COLUMN IF NOT EXISTS amount_confirmed boolean NOT NULL DEFAULT true;

UPDATE public.expenses SET expense_type = 'reparacion'
  WHERE lower(category) LIKE '%repar%';
UPDATE public.expenses SET expense_type = 'fijo_recurrente', due_day = COALESCE(due_day, EXTRACT(DAY FROM expense_date)::int)
  WHERE recurrence_type = 'monthly' AND expense_type <> 'reparacion';

CREATE OR REPLACE FUNCTION public.ensure_monthly_fixed_expenses()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _start date := date_trunc('month', CURRENT_DATE)::date;
  _end date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
  _inserted integer := 0;
  r record;
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;

  FOR r IN
    SELECT DISTINCT ON (property_id, unit_id, category)
      property_id, unit_id, category, amount, description, COALESCE(due_day, EXTRACT(DAY FROM expense_date)::int) AS d
    FROM public.expenses
    WHERE owner_id = _uid AND expense_type = 'fijo_recurrente' AND expense_date < _start
    ORDER BY property_id, unit_id, category, expense_date DESC
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.owner_id = _uid AND e.expense_type = 'fijo_recurrente'
        AND e.property_id = r.property_id
        AND e.category = r.category
        AND (e.unit_id IS NOT DISTINCT FROM r.unit_id)
        AND e.expense_date BETWEEN _start AND _end
    ) THEN
      INSERT INTO public.expenses(owner_id, property_id, unit_id, category, amount, expense_date, description, recurrence_type, expense_type, due_day, amount_confirmed)
      VALUES (_uid, r.property_id, r.unit_id, r.category, r.amount,
              make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int, LEAST(GREATEST(COALESCE(r.d,1),1),28)),
              r.description, 'monthly', 'fijo_recurrente', LEAST(GREATEST(COALESCE(r.d,1),1),28), false);
      _inserted := _inserted + 1;
    END IF;
  END LOOP;

  RETURN _inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_monthly_fixed_expenses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_monthly_fixed_expenses() TO authenticated;