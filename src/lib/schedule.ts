import { supabase } from "@/integrations/supabase/client";

export type DayCharge = {
  id: string;
  day: number;
  unit: string;
  property: string;
  tenant: string;
  expected: number;
  paid: number;
  status: "paid" | "partial" | "pending" | "overdue";
};

export type DayExpense = {
  id: string;
  day: number;
  category: string;
  description: string | null;
  property: string;
  amount: number;
  confirmed: boolean;
};

function clampDay(d: number, year: number, month: number) {
  const last = new Date(year, month, 0).getDate();
  return Math.min(Math.max(d || 1, 1), last);
}

export async function fetchMonthSchedule(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);

  const [chargesRes, allocRes, expRes] = await Promise.all([
    supabase
      .from("charges")
      .select("id, due_date, amount_expected, status, unit:units(name, due_day, property:properties(name)), tenant:tenants(full_name)")
      .eq("period_year", year)
      .eq("period_month", month),
    supabase.from("payment_allocations").select("charge_id, amount_allocated"),
    supabase
      .from("expenses")
      .select("id, category, description, amount, expense_date, due_day, amount_confirmed, expense_type, property:properties(name)")
      .eq("expense_type", "fijo_recurrente")
      .gte("expense_date", start)
      .lte("expense_date", end),
  ]);

  const paidMap = new Map<string, number>();
  for (const a of allocRes.data ?? []) paidMap.set(a.charge_id, (paidMap.get(a.charge_id) ?? 0) + Number(a.amount_allocated));

  const charges: DayCharge[] = (chargesRes.data ?? []).map((c) => {
    const paid = paidMap.get(c.id) ?? 0;
    const expected = Number(c.amount_expected);
    const day = clampDay(c.unit?.due_day ?? new Date(c.due_date).getUTCDate(), year, month);
    const dueDate = new Date(year, month - 1, day);
    let status: DayCharge["status"];
    if (paid >= expected) status = "paid";
    else if (dueDate < startOfToday()) status = "overdue";
    else if (paid > 0) status = "partial";
    else status = "pending";
    return {
      id: c.id,
      day,
      unit: c.unit?.name ?? "—",
      property: c.unit?.property?.name ?? "",
      tenant: c.tenant?.full_name ?? "—",
      expected,
      paid,
      status,
    };
  });

  const expenses: DayExpense[] = (expRes.data ?? []).map((e) => ({
    id: e.id,
    day: clampDay(e.due_day ?? new Date(e.expense_date).getUTCDate(), year, month),
    category: e.category,
    description: e.description,
    property: e.property?.name ?? "",
    amount: Number(e.amount),
    confirmed: e.amount_confirmed,
  }));

  return { year, month, charges, expenses };
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(year: number, month: number, day: number) {
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
}

export type DayTone = "paid" | "soon" | "overdue" | "expense";

export function chargeTone(c: DayCharge, year: number, month: number): DayTone {
  if (c.status === "paid") return "paid";
  const diff = daysUntil(year, month, c.day);
  if (diff < 0) return "overdue";
  return diff <= 5 ? "soon" : "soon";
}

export const TONE_DOT: Record<DayTone, string> = {
  paid: "bg-success",
  soon: "bg-warning",
  overdue: "bg-destructive",
  expense: "bg-rust",
};

/* ---------- Comunicaciones ---------- */

export type CommTarget = {
  chargeId: string;
  tenantId: string | null;
  tenant: string;
  phone: string | null;
  unit: string;
  property: string;
  remaining: number;
  expected: number;
  dueDate: string;
  daysLate: number;
  daysToDue: number;
};

export async function fetchCommTargets(): Promise<CommTarget[]> {
  const [cRes, aRes] = await Promise.all([
    supabase
      .from("charges")
      .select("id, due_date, amount_expected, status, tenant_id, unit:units(name, property:properties(name)), tenant:tenants(full_name, phone)")
      .in("status", ["pending", "partial", "overdue"])
      .order("due_date"),
    supabase.from("payment_allocations").select("charge_id, amount_allocated"),
  ]);
  const paid = new Map<string, number>();
  for (const a of aRes.data ?? []) paid.set(a.charge_id, (paid.get(a.charge_id) ?? 0) + Number(a.amount_allocated));

  const today = startOfToday();
  return (cRes.data ?? [])
    .map((c) => {
      const expected = Number(c.amount_expected);
      const remaining = Math.max(expected - (paid.get(c.id) ?? 0), 0);
      const due = new Date(c.due_date + "T00:00:00");
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
      return {
        chargeId: c.id,
        tenantId: c.tenant_id ?? null,
        tenant: c.tenant?.full_name ?? "Inquilino",
        phone: c.tenant?.phone ?? null,
        unit: c.unit?.name ?? "—",
        property: c.unit?.property?.name ?? "",
        remaining,
        expected,
        dueDate: c.due_date,
        daysLate: diff < 0 ? -diff : 0,
        daysToDue: diff > 0 ? diff : 0,
      };
    })
    .filter((t) => t.remaining > 0)
    .sort((a, b) => b.daysLate - a.daysLate || a.daysToDue - b.daysToDue);
}

export function draftMessage(t: CommTarget): string {
  const monto = "S/ " + t.remaining.toLocaleString("es-PE", { maximumFractionDigits: 2 });
  const lugar = `${t.unit}${t.property ? ` (${t.property})` : ""}`;
  if (t.daysLate > 0) {
    return `Hola ${t.tenant}, ¿cómo estás? Te escribo por el alquiler de ${lugar}. Al día de hoy figura pendiente ${monto}, con ${t.daysLate} ${t.daysLate === 1 ? "día" : "días"} de atraso respecto a la fecha acordada (${new Date(t.dueDate + "T00:00:00").toLocaleDateString("es-PE")}). Te agradecería mucho que lo puedas regularizar en los próximos días o me cuentes cuándo podrías hacerlo, para dejarlo ordenado. Cualquier duda me escribes con confianza. ¡Gracias!`;
  }
  const cuando = t.daysToDue === 0 ? "vence hoy" : `vence en ${t.daysToDue} ${t.daysToDue === 1 ? "día" : "días"}`;
  return `Hola ${t.tenant}, espero que estés muy bien. Solo un recordatorio amable: el alquiler de ${lugar} ${cuando} (${new Date(t.dueDate + "T00:00:00").toLocaleDateString("es-PE")}) por ${monto}. Si ya lo enviaste, avísame para registrarlo. ¡Gracias y buen día!`;
}
/* ---------- Historial de comunicaciones ---------- */

export type CommEvent = {
  id: string;
  createdAt: string;
  kind: "message_sent" | "comm_note";
  description: string;
  message: string | null;
  tenantId: string | null;
};

export async function fetchCommHistory(): Promise<CommEvent[]> {
  const { data } = await supabase
    .from("activity_log")
    .select("id, created_at, action_type, entity_id, entity_type, description, metadata")
    .in("action_type", ["message_sent", "comm_note"])
    .order("created_at", { ascending: false })
    .limit(300);
  return (data ?? []).map((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      createdAt: r.created_at,
      kind: r.action_type === "comm_note" ? "comm_note" : "message_sent",
      description: r.description,
      message: typeof meta["message"] === "string" ? (meta["message"] as string) : null,
      tenantId: typeof meta["tenant_id"] === "string" ? (meta["tenant_id"] as string) : r.entity_type === "tenant" ? r.entity_id : null,
    };
  });
}
