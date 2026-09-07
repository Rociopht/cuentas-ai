import { supabase } from "@/integrations/supabase/client";
import { monthBounds, todayISO, toISODate } from "@/lib/date";

// Los límites del mes se construyen como strings YYYY-MM-DD (ver src/lib/date.ts):
// usar toISOString() sobre una fecha local corría el rango un día en GMT-5.
function periodBounds(year: number, month: number) {
  return monthBounds(year, month);
}

export async function fetchDashboard(year: number, month: number) {
  const { start, end } = periodBounds(year, month);

  const [chargesRes, allocRes, expensesRes, propsRes, unitsRes] = await Promise.all([
    supabase.from("charges").select("id, amount_expected, status, unit_id").eq("period_year", year).eq("period_month", month),
    supabase.from("payment_allocations").select("amount_allocated, charge:charges!inner(period_year, period_month, unit_id)").eq("charge.period_year", year).eq("charge.period_month", month),
    supabase.from("expenses").select("amount, property_id").gte("expense_date", start).lte("expense_date", end),
    supabase.from("properties").select("id, name, address"),
    supabase.from("units").select("id, property_id"),
  ]);

  const charges = chargesRes.data ?? [];
  const allocs = allocRes.data ?? [];
  const expenses = expensesRes.data ?? [];
  const properties = propsRes.data ?? [];
  const units = unitsRes.data ?? [];

  const expected = charges.reduce((s, c) => s + Number(c.amount_expected), 0);
  const collected = allocs.reduce((s, a) => s + Number(a.amount_allocated), 0);
  const pending = Math.max(expected - collected, 0);
  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const result = collected - spent;

  const unitToProp = new Map(units.map((u) => [u.id, u.property_id]));
  const propMap = new Map<string, { id: string; name: string; address: string | null; expected: number; collected: number; spent: number; units: number }>();
  for (const p of properties) propMap.set(p.id, { id: p.id, name: p.name, address: p.address, expected: 0, collected: 0, spent: 0, units: 0 });
  for (const u of units) if (propMap.has(u.property_id)) propMap.get(u.property_id)!.units++;
  for (const c of charges) {
    const pid = unitToProp.get(c.unit_id);
    if (pid && propMap.has(pid)) propMap.get(pid)!.expected += Number(c.amount_expected);
  }
  for (const a of allocs) {
    const unitId = (a as { charge?: { unit_id?: string } | null }).charge?.unit_id;
    const pid = unitId ? unitToProp.get(unitId) : undefined;
    if (pid && propMap.has(pid)) propMap.get(pid)!.collected += Number(a.amount_allocated);
  }
  for (const e of expenses) if (propMap.has(e.property_id)) propMap.get(e.property_id)!.spent += Number(e.amount);

  const overdue = charges.filter((c) => c.status === "overdue").length;
  const partial = charges.filter((c) => c.status === "partial").length;

  const { count: reviewCount } = await supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending_review");

  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const { data: expiring } = await supabase
    .from("contracts")
 };
   .select("id, end_date, unit:units(name, property:properties(name)), tenant:tenants(full_name)")
    .eq("status", "active")
    .lte("end_date", toISODate(in30))
    .gte("end_date", todayISO());

  return {
    period: { year, month },
    totals: { expected, collected, pending, spent, result },
    counts: { overdue, partial, review: reviewCount ?? 0, expiring: expiring?.length ?? 0 },
    properties: Array.from(propMap.values()).map((p) => ({ ...p, result: p.collected - p.spent, pending: Math.max(p.expected - p.collected, 0) })),
    expiringContracts: expiring ?? [],
  