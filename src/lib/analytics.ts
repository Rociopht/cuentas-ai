import { supabase } from "@/integrations/supabase/client";
import { monthLabel } from "@/lib/format";

export type MonthPoint = {
  key: string;
  label: string;
  year: number;
  month: number;
  expected: number;
  collected: number;
  fixed: number;
  variable: number;
  repairs: number;
  expenses: number;
  result: number;
};

export async function fetchMonthlySeries(months = 12): Promise<MonthPoint[]> {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const startStr = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`;

  const [chargesRes, allocRes, expRes] = await Promise.all([
    supabase.from("charges").select("id, period_year, period_month, amount_expected"),
    supabase.from("payment_allocations").select("charge_id, amount_allocated"),
    supabase.from("expenses").select("amount, expense_date, expense_type").gte("expense_date", startStr),
  ]);

  const points: MonthPoint[] = [];
  const index = new Map<string, MonthPoint>();
  for (let i = 0; i < months; i++) {
    const d = new Date(first.getFullYear(), first.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${month}`;
    const p: MonthPoint = { key, label: monthLabel(month), year, month, expected: 0, collected: 0, fixed: 0, variable: 0, repairs: 0, expenses: 0, result: 0 };
    points.push(p);
    index.set(key, p);
  }

  const chargeById = new Map((chargesRes.data ?? []).map((c) => [c.id, c]));
  for (const c of chargesRes.data ?? []) {
    const p = index.get(`${c.period_year}-${c.period_month}`);
    if (p) p.expected += Number(c.amount_expected);
  }
  for (const a of allocRes.data ?? []) {
    const c = chargeById.get(a.charge_id);
    if (!c) continue;
    const p = index.get(`${c.period_year}-${c.period_month}`);
    if (p) p.collected += Number(a.amount_allocated);
  }
  for (const e of expRes.data ?? []) {
    const d = new Date(e.expense_date + "T00:00:00");
    const p = index.get(`${d.getFullYear()}-${d.getMonth() + 1}`);
    if (!p) continue;
    const amount = Number(e.amount);
    if (e.expense_type === "fijo_recurrente") p.fixed += amount;
    else if (e.expense_type === "reparacion") p.repairs += amount;
    else p.variable += amount;
    p.expenses += amount;
  }
  for (const p of points) p.result = p.collected - p.expenses;
  return points;
}

export type Grain = "month" | "quarter" | "year";

export type Bucket = { key: string; label: string; collected: number; expenses: number; repairs: number; result: number; expected: number };

export function bucketize(points: MonthPoint[], grain: Grain): Bucket[] {
  const out: Bucket[] = [];
  const idx = new Map<string, Bucket>();
  for (const p of points) {
    let key: string;
    let label: string;
    if (grain === "month") {
      key = p.key;
      label = `${p.label} ${String(p.year).slice(2)}`;
    } else if (grain === "quarter") {
      const q = Math.floor((p.month - 1) / 3) + 1;
      key = `${p.year}-Q${q}`;
      label = `T${q} ${String(p.year).slice(2)}`;
    } else {
      key = String(p.year);
      label = String(p.year);
    }
    let b = idx.get(key);
    if (!b) {
      b = { key, label, collected: 0, expenses: 0, repairs: 0, result: 0, expected: 0 };
      idx.set(key, b);
      out.push(b);
    }
    b.collected += p.collected;
    b.expenses += p.expenses;
    b.repairs += p.repairs;
    b.expected += p.expected;
    b.result += p.collected - p.expenses;
  }
  return out;
}
