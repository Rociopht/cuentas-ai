import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, monthLabel, CHARGE_STATUS_COLOR, CHARGE_STATUS_LABEL } from "@/lib/format";
import { formatDate, todayISO } from "@/lib/date";
import { CheckCircle2, Inbox, Plus, MoreHorizontal, Loader2, MessageCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ensureCurrentMonthCharges } from "@/lib/ensure-charges";
import { daysFromToday, dayOfMonth } from "@/lib/date";
import { fetchMonthlySeries } from "@/lib/analytics";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";

import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/charges")({
  component: Charges,
  head: () => ({
    meta: [
      { title: "Cobros y pagos por revisar · Cuentas AI" },
      { name: "description", content: "Concilia pagos recibidos y revisa el estado de los cobros del mes: vencidos, por cobrar y pagados." },
      { property: "og:title", content: "Cobros y pagos por revisar · Cuentas AI" },
      { property: "og:description", content: "Todo el flujo de cobranza de tus alquileres en una sola vista." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Charges() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [form, setForm] = useState({ amount: "", payment_date: todayISO(), payment_method: "transferencia", unit_id: "", charge_id: "", notes: "" });


  const { data, isLoading } = useQuery({
    queryKey: ["charges-page"],
    queryFn: async () => {
      await ensureCurrentMonthCharges();
      const [c, a, payments, units] = await Promise.all([
        supabase.from("charges").select("id, unit_id, period_year, period_month, amount_expected, status, due_date, unit:units(name, property:properties(name)), tenant:tenants(full_name, phone), contract:contracts(currency)").order("due_date", { ascending: false }).limit(200),
        supabase.from("payment_allocations").select("charge_id, amount_allocated"),
        supabase.from("payments").select("id, amount, payment_date, payment_method, status, notes, unit:units(name, property:properties(name)), tenant:tenants(full_name)").order("payment_date", { ascending: false }).limit(60),
        supabase.from("units").select("id, name, property:properties(name)").order("name"),
      ]);
      const paid = new Map<string, number>();
      for (const x of a.data ?? []) paid.set(x.charge_id, (paid.get(x.charge_id) ?? 0) + Number(x.amount_allocated));
      return {
        charges: (c.data ?? []).map((r) => ({ ...r, paid: paid.get(r.id) ?? 0 })),
        payments: payments.data ?? [],
        units: units.data ?? [],
      };
    },
  });

  async function quickPay(row: Row) {
    const remaining = Math.max(Number(row.amount_expected) - row.paid, 0);
    if (remaining <= 0) return;
    setPayingId(row.id);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) { toast.error("Tu sesión expiró"); return; }
      const { data: pay, error } = await supabase.from("payments").insert({
        owner_id,
        amount: remaining,
        payment_date: todayISO(),
        payment_method: "transferencia",
        unit_id: row.unit_id,
        status: "confirmed",
        notes: "Pago completo registrado desde Cobros",
      }).select("id").single();
      if (error || !pay) { toast.error(error?.message ?? "No se pudo registrar"); return; }
      const { error: aErr } = await supabase.from("payment_allocations").insert({
        owner_id, payment_id: pay.id, charge_id: row.id, amount_allocated: remaining,
      });
      if (aErr) { toast.error(aErr.message); return; }
      await supabase.rpc("recalc_charge_status", { _charge_id: row.id });
      toast.success(`Pago de ${formatMoney(remaining)} registrado`);
      await qc.invalidateQueries();
    } finally {
      setPayingId(null);
    }
  }

  function openPartial(row: Row) {
    setForm({ amount: String(Math.max(Number(row.amount_expected) - row.paid, 0)), payment_date: todayISO(), payment_method: "transferencia", unit_id: row.unit_id, charge_id: row.id, notes: "" });
    setOpen(true);
  }


  async function createPayment() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !form.unit_id) return;
    const amount = Number(form.amount);
    if (!(amount > 0)) { toast.error("Monto inválido"); return; }
    const { data: pay, error } = await supabase.from("payments").insert({
      owner_id: userData.user.id,
      amount,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      unit_id: form.unit_id,
      notes: form.notes || null,
      status: form.charge_id ? "confirmed" : "pending_review",
    }).select().single();
    if (error || !pay) { toast.error(error?.message ?? "Error"); return; }
    if (form.charge_id) {
      const c = data?.charges.find((x) => x.id === form.charge_id);
      const alloc = Math.min(amount, Math.max(Number(c?.amount_expected ?? amount) - Number(c?.paid ?? 0), 0) || amount);
      const { error: aErr } = await supabase.from("payment_allocations").insert({
        owner_id: userData.user.id,
        payment_id: pay.id,
        charge_id: form.charge_id,
        amount_allocated: alloc,
      });
      if (aErr) toast.error(aErr.message);
      else await supabase.rpc("recalc_charge_status", { _charge_id: form.charge_id });
    }
    toast.success("Pago registrado");
    setOpen(false);
    setForm({ amount: "", payment_date: todayISO(), payment_method: "transfer", unit_id: "", charge_id: "", notes: "" });
    qc.invalidateQueries();
  }

  async function confirmPayment(id: string) {
    const { error } = await supabase.from("payments").update({ status: "confirmed" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Confirmado");
    qc.invalidateQueries();
  }

  const review = data?.payments.filter((p) => p.status === "pending_review") ?? [];
  const overdue = data?.charges.filter((c) => c.status === "overdue") ?? [];
  const pendingList = data?.charges.filter((c) => c.status === "pending" || c.status === "partial") ?? [];
  const paidList = data?.charges.filter((c) => c.status === "paid") ?? [];
  const unitCharges = data?.charges.filter((c) => c.unit_id === form.unit_id && c.status !== "paid") ?? [];

  const { data: series } = useQuery({ queryKey: ["monthly-series"], queryFn: () => fetchMonthlySeries(6) });
  const now = new Date();
  const monthCharges = data?.charges.filter((c) => c.period_year === now.getFullYear() && c.period_month === now.getMonth() + 1) ?? [];
  const expectedMonth = monthCharges.reduce((s, c) => s + Number(c.amount_expected), 0);
  const collectedMonth = monthCharges.reduce((s, c) => s + c.paid, 0);
  const overdueMonth = monthCharges.filter((c) => c.status === "overdue").reduce((s, c) => s + Math.max(Number(c.amount_expected) - c.paid, 0), 0);
  const pendingMonth = Math.max(expectedMonth - collectedMonth - overdueMonth, 0);
  const pct = expectedMonth > 0 ? Math.round((collectedMonth / expectedMonth) * 100) : 0;
  const donut = [
    { name: "Cobrado", value: collectedMonth, fill: "var(--success)" },
    { name: "Por cobrar", value: pendingMonth, fill: "var(--warning)" },
    { name: "Atrasado", value: overdueMonth, fill: "var(--destructive)" },
  ].filter((d) => d.value > 0);
  const bars = (series ?? []).map((p) => ({ label: p.label, Esperado: Math.round(p.expected), Cobrado: Math.round(p.collected) }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cobros</h1>
          <p className="text-muted-foreground">Concilia lo que llegó y revisa el estado del mes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Registrar pago</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Unidad</Label>
                <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v, charge_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una unidad" /></SelectTrigger>
                  <SelectContent>
                    {data?.units.map((u) => <SelectItem key={u.id} value={u.id}>{u.property?.name} · {u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monto</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Fecha</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
              </div>
              <div>
                <Label>Método</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="yape">Yape / Plin</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.unit_id && unitCharges.length > 0 && (
                <div>
                  <Label>Aplicar a cobro (opcional)</Label>
                  <Select value={form.charge_id} onValueChange={(v) => setForm({ ...form, charge_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Dejar por revisar" /></SelectTrigger>
                    <SelectContent>
                      {unitCharges.map((c) => <SelectItem key={c.id} value={c.id}>{monthLabel(c.period_month)} {c.period_year} · {formatMoney(Number(c.amount_expected))}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Referencia, operación..." /></div>
            </div>
            <DialogFooter><Button onClick={createPayment} disabled={!form.unit_id || !form.amount}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Cobrado este mes</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-success">{pct}%</span>
            <span className="text-sm text-muted-foreground">{formatMoney(collectedMonth)} de {formatMoney(expectedMonth)}</span>
          </div>
          <Progress value={pct} className="mt-3" />
          <div className="mt-3 h-36">
            {donut.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none">
                    {donut.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Cobrado</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" />Por cobrar {formatMoney(pendingMonth)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />Atrasado {formatMoney(overdueMonth)}</span>
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="text-xs uppercase text-muted-foreground">Esperado vs. cobrado · últimos 6 meses</div>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="Esperado" fill="var(--muted-foreground)" opacity={0.35} radius={4} />
                <Bar dataKey="Cobrado" fill="var(--primary)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-medium"><Inbox className="h-4 w-4 text-warning" /> Por revisar ({review.length})</h2>
        {review.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nada por conciliar.</Card>
        ) : (
          <div className="space-y-2">
            {review.map((p) => (
              <Card key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.unit?.property?.name ?? "Sin identificar"}{p.unit ? ` · ${p.unit.name}` : ""}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{formatDate(p.payment_date)} · {p.payment_method}{p.notes ? ` · ${p.notes}` : ""}</div>
                  <div className="mt-1 flex gap-1.5">
                    <Badge className={p.unit ? "bg-warning/15 text-warning-foreground border border-warning/30" : "bg-muted text-muted-foreground"}>
                      {p.unit ? "Posible coincidencia" : "Sin identificar"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right font-semibold">{formatMoney(Number(p.amount))}</div>
                  <Button size="sm" variant="outline" onClick={() => confirmPayment(p.id)}><CheckCircle2 className="mr-1 h-4 w-4" />Confirmar</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <Tabs defaultValue="overdue">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overdue"><span className="mr-1.5 h-2 w-2 rounded-full bg-destructive" />Te deben ({overdue.length})</TabsTrigger>
            <TabsTrigger value="pending"><span className="mr-1.5 h-2 w-2 rounded-full bg-warning" />Pagan pronto ({pendingList.length})</TabsTrigger>
            <TabsTrigger value="paid"><span className="mr-1.5 h-2 w-2 rounded-full bg-success" />Pagados ({paidList.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="overdue"><ChargeList items={overdue} loading={isLoading} empty="Nadie te debe. ¡Bien hecho!" /></TabsContent>
          <TabsContent value="pending"><ChargeList items={pendingList} loading={isLoading} empty="Sin cobros próximos." /></TabsContent>
          <TabsContent value="paid"><ChargeList items={paidList} loading={isLoading} empty="Aún no hay cobros pagados." /></TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

type Row = { id: string; period_year: number; period_month: number; amount_expected: number; status: string; due_date: string; paid: number; unit: { name: string; property: { name: string } | null } | null; tenant: { full_name: string } | null };

function ChargeList({ items, loading, empty }: { items: Row[]; loading: boolean; empty: string }) {
  if (loading) return <div className="text-muted-foreground">Cargando…</div>;
  if (items.length === 0) return <Card className="p-8 text-center text-muted-foreground">{empty}</Card>;
  return (
    <div className="space-y-2">
      {items.map((c) => {
        const remaining = Math.max(Number(c.amount_expected) - c.paid, 0);
        return (
          <Card key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
            <div className="min-w-0">
              <div className="truncate font-medium">{c.unit?.property?.name} · {c.unit?.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {c.tenant?.full_name ?? "—"} · {monthLabel(c.period_month)} {c.period_year} · vence {formatDate(c.due_date)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatMoney(remaining)}</div>
              <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                {c.paid > 0 && <span>Pagado {formatMoney(c.paid)}/{formatMoney(Number(c.amount_expected))}</span>}
                <Badge className={CHARGE_STATUS_COLOR[c.status] ?? ""}>{CHARGE_STATUS_LABEL[c.status] ?? c.status}</Badge>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
