import { supabase } from "@/integrations/supabase/client";
import { daysInMonth, monthBounds } from "@/lib/date";

/**
 * Genera (del lado del cliente) los cobros del mes en curso para cada contrato
 * activo que aún no tenga uno. Así la app siempre muestra la bandeja del mes
 * aunque no exista un cron en el backend.
 */
export async function ensureCurrentMonthCharges(): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { start, end } = monthBounds(year, month);

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("id, owner_id, unit_id, tenant_id, rent_amount, start_date, end_date, unit:units(due_day)")
    .eq("status", "active");
  if (error || !contracts || contracts.length === 0) return 0;

  const { data: existing } = await supabase
    .from("charges")
    .select("contract_id")
    .eq("period_year", year)
    .eq("period_month", month);
  const have = new Set((existing ?? []).map((c) => c.contract_id));

  const rows = contracts
    .filter((c) => !have.has(c.id))
    .filter((c) => c.start_date <= end && (!c.end_date || c.end_date >= start))
    .map((c) => {
      const day = Math.min(Math.max((c.unit as { due_day: number } | null)?.due_day ?? 1, 1), daysInMonth(year, month));
      return {
        owner_id: c.owner_id,
        unit_id: c.unit_id,
        contract_id: c.id,
        tenant_id: c.tenant_id,
        concept: "Alquiler",
        period_month: month,
        period_year: year,
        amount_expected: c.rent_amount,
        due_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        status: "pending",
      };
    });

  if (rows.length === 0) return 0;
  const { error: insErr } = await supabase.from("charges").insert(rows);
  if (insErr) return 0;
  return rows.length;
}
