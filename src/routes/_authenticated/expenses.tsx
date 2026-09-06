import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { formatDate, isInMonth, todayISO } from "@/lib/date";
import { Plus, Receipt, Wrench, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { fetchMonthlySeries } from "@/lib/analytics";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  { v: "maintenance", l: "Mantenimiento" },
  { v: "utilities", l: "Servicios" },
  { v: "taxes", l: "Impuestos" },
  { v: "hoa", l: "Mantenimiento HOA" },
  { v: "repairs", l: "Reparaciones" },
  { v: "insurance", l: "Seguros" },
  { v: "management", l: "Administración" },
  { v: "other", l: "Otros" },
];

const TYPES = [
  { v: "fijo_recurrente", l: "Fijo recurrente" },
  { v: "variable", l: "Variable" },
  { v: "reparacion", l: "Reparación / imprevisto" },
];

function catLabel(c: string) {
  return CATEGORIES.find((x) => x.v === c)?.l ?? c;
}

export const Route = createFileRoute("/_authenticated/expenses")({
  component: Expenses,
  head: () => ({
    meta: [
      { title: "Gastos fijos, variables e imprevistos · Cuentas AI" },
      { name: "description", content: "Controla tus gastos separados por tipo: fijos recurrentes con día de vencimiento, variables con variación mensual y reparaciones imprevistas." },
      { property: "og:title", content: "Gastos fijos, variables e imprevistos · Cuentas AI" },
      { property: "og:description", content: "Distingue lo normal de lo imprevisto y confirma cada mes tus gastos fijos en un clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Exp = {
  id: string; category: string; amount: number; expense_date: string; description: string | null;
  expense_type: string; due_day: number | null; amount_confirmed: boolean;
  property: { name: string } | null; unit: { name: string } | null;
};

function Expenses() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Exp | null>(null);
  const [confirmAmount, setConfirmAmount] = useState("");
  const [form, setForm] = useState({ expense_type: "variable", due_day: "1", property_id: "", unit_id: "", category: "maintenance", amount: "", description: "", expense_date: todayISO() });

  useEffect(() => {
    supabase.rpc("ensure_monthly_fixed_expenses").then(({ data: n }) => {
      if (n && n > 0) qc.invalidateQueries({ queryKey: ["expenses-page"] });
    });
  }, [qc]);

  const { data } = useQuery({
    queryKey: ["expenses-page"],
    queryFn: async () => {
      const [exp, props, units] = await Promise.all([
        supabase.from("expenses").select("id, category, amount, expense_date, description, expense_type, due_day, amount_confirmed, property:properties(name), unit:units(name)").order("expense_date", { ascending: false }).limit(300),
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("units").select("id, name, property_id").order("name"),
      ]);
      return { expenses: (exp.data ?? []) as unknown as Exp[], properties: props.data ?? [], units: units.data ?? [] };
    },
  });

  async function create() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !form.property_id || !form.amount) return;
    const { error } = await supabase.from("expenses").insert({
      owner_id: userData.user.id,
      property_id: form.property_id,
      unit_id: form.unit_id || null,
      category: form.category,
      amount: Number(form.amount),
      description: form.description || null,
      expense_date: form.expense_date,
      expense_type: form.expense_type,
      due_day: form.expense_type === "fijo_recurrente" ? Number(form.due_day) : null,
      recurrence_type: form.expense_type === "fijo_recurrente" ? "monthly" : null,
      amount_confirmed: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Gasto registrado");
    setOpen(false);
    setForm({ expense_type: "variable", due_day: "1", property_id: "", unit_id: "", category: "maintenance", amount: "", description: "", expense_date: todayISO() });
    qc.invalidateQueries();
  }

  async function saveConfirm() {
    if (!confirmTarget) return;
    const amount = Number(confirmAmount);
    if (!(amount > 0)) { toast.error("Monto inválido"); return; }
    const { error } = await supabase.from("expenses").update({ amount, amount_confirmed: true }).eq("id", confirmTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Monto confirmado");
    setConfirmTarget(null);
    qc.invalidateQueries();
  }

  const all = data?.expenses ?? [];
  const now = new Date();
  // Un solo criterio de "pertenece al mes", por día calendario (sin UTC de por medio).
  const inMonth = (e: Exp, offset: number) => {
    const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return isInMonth(e.expense_date, ref.getFullYear(), ref.getMonth() + 1);
  };

  const fixed = all.filter((e) => e.expense_type === "fijo_recurrente");
  const fixedThisMonth = fixed.filter((e) => inMonth(e, 0));
  const variables = all.filter((e) => e.expense_type === "variable");
  const repairs = all.filter((e) => e.expense_type === "reparacion");

  const varThis = variables.filter((e) => inMonth(e, 0));
  const repairsThisList = repairs.filter((e) => inMonth(e, 0));
  const varPrev = variables.filter((e) => inMonth(e, 1));
  const byCat = (rows: Exp[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.category, (m.get(r.category) ?? 0) + Number(r.amount));
    return m;
  };
  const catThis = byCat(varThis);
  const catPrev = byCat(varPrev);
  const prevMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString("es-PE", { month: "long" });

  const typicalMonthly = [...fixedThisMonth, ...varThis].reduce((s, e) => s + Number(e.amount), 0);
  const repairsThis = repairs.filter((e) => inMonth(e, 0)).reduce((s, e) => s + Number(e.amount), 0);
  const propUnits = data?.units.filter((u) => u.property_id === form.property_id) ?? [];

  const { data: series } = useQuery({ queryKey: ["monthly-series"], queryFn: () => fetchMonthlySeries(6) });
  const trend = (series ?? []).map((p) => ({ label: p.label, Fijos: Math.round(p.fixed), Variables: Math.round(p.variable), Imprevistos: Math.round(p.repairs) }));
  const catBars = Array.from(catThis.entries())
    .map(([cat, amount]) => ({ cat: catLabel(cat), "Este mes": Math.round(amount), [`Mes anterior`]: Math.round(catPrev.get(cat) ?? 0) }))
    .sort((a, b) => b["Este mes"] - a["Este mes"])
    .slice(0, 6);
  const biggest = catBars[0];
  const worst = Array.from(catThis.entries())
    .map(([cat, amount]) => { const prev = catPrev.get(cat) ?? 0; return { cat: catLabel(cat), pct: prev > 0 ? Math.round(((amount - prev) / prev) * 100) : null }; })
    .filter((x) => x.pct !== null)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground">Lo fijo, lo variable y lo imprevisto, separados para leer bien tu rentabilidad.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Registrar gasto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tipo de gasto</Label>
                <Select value={form.expense_type} onValueChange={(v) => setForm({ ...form, expense_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {form.expense_type === "fijo_recurrente" && (
                <div>
                  <Label>Día de vencimiento (cada mes)</Label>
                  <Input type="number" min={1} max={28} value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Propiedad</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v, unit_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {data?.properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {propUnits.length > 0 && (
                <div>
                  <Label>Unidad (opcional)</Label>
                  <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Toda la propiedad" /></SelectTrigger>
                    <SelectContent>
                      {propUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoría</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Monto</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              </div>
              <div><Label>Fecha</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle" /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={!form.property_id || !form.amount}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Gasto típico de este mes</div>
          <div className="mt-1 text-3xl font-semibold text-destructive">{formatMoney(typicalMonthly)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Fijos + variables. No incluye reparaciones.</p>
        </Card>
        <Card className="border-l-4 border-l-rust p-5">
          <div className="text-xs uppercase text-muted-foreground">Imprevistos del mes</div>
          <div className="mt-1 text-3xl font-semibold text-rust">{formatMoney(repairsThis)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Reparaciones, fuera del promedio típico.</p>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">En qué se va tu plata · últimos 6 meses</div>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} tickFormatter={(v: number) => "S/" + Math.round(v / 1000) + "k"} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend />
                <Bar dataKey="Fijos" stackId="a" fill="var(--primary)" />
                <Bar dataKey="Variables" stackId="a" fill="var(--muted-foreground)" opacity={0.5} />
                <Bar dataKey="Imprevistos" stackId="a" fill="var(--rust)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Variables por categoría vs. {prevMonthName}</div>
          <div className="mt-3 h-56">
            {catBars.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin gastos variables este mes.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catBars} layout="vertical">
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => "S/" + v} />
                  <YAxis type="category" dataKey="cat" tickLine={false} axisLine={false} fontSize={11} width={92} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Legend />
                  <Bar dataKey="Mes anterior" fill="var(--muted-foreground)" opacity={0.35} radius={3} />
                  <Bar dataKey="Este mes" fill="var(--destructive)" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {biggest ? <>Tu mayor gasto variable es <strong>{biggest.cat}</strong> ({formatMoney(biggest["Este mes"])}).</> : "Registra gastos variables para comparar."}
            {worst?.pct ? <> Lo que más subió: <strong>{worst.cat}</strong> {worst.pct > 0 ? "+" : ""}{worst.pct}%.</> : null}
          </p>
        </Card>
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-medium"><RefreshCw className="h-4 w-4 text-primary" /> Fijos recurrentes</h2>
        <div className="space-y-2">
          {fixedThisMonth.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Aún no registras gastos fijos este mes.</Card>}
          {fixedThisMonth.map((e) => (
            <Card key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{e.description ?? catLabel(e.category)}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{e.property?.name}{e.unit ? ` · ${e.unit.name}` : ""} · vence el {e.due_day ?? new Date(e.expense_date.slice(0, 10).split("-").map(Number)[2] ?? 1, 0, 1).getDate()} de cada mes</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-semibold text-destructive">{formatMoney(Number(e.amount))}</div>
                  {!e.amount_confirmed && <Badge className="mt-1 bg-warning/15 text-warning-foreground border border-warning/30">Por confirmar</Badge>}
                </div>
                <Button size="sm" variant="outline" onClick={() => { setConfirmTarget(e); setConfirmAmount(String(e.amount)); }}>
                  Confirmar monto
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-medium"><Receipt className="h-4 w-4 text-muted-foreground" /> Variables</h2>
        {catThis.size > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {Array.from(catThis.entries()).map(([cat, amount]) => {
              const prev = catPrev.get(cat) ?? 0;
              const pct = prev > 0 ? Math.round(((amount - prev) / prev) * 100) : null;
              const up = (pct ?? 0) > 0;
              return (
                <Badge key={cat} className="bg-muted text-muted-foreground">
                  {catLabel(cat)}: {formatMoney(amount)}
                  {pct !== null && (
                    <span className={"ml-1 inline-flex items-center gap-0.5 " + (up ? "text-destructive" : "text-success")}>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {pct > 0 ? "+" : ""}{pct}% vs. {prevMonthName}
                    </span>
                  )}
                </Badge>
              );
            })}
          </div>
        )}
        <div className="space-y-2">
          {varThis.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Sin gastos variables registrados.</Card>}
          {varThis.slice(0, 40).map((e) => (
            <Card key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{e.description ?? catLabel(e.category)}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{e.property?.name}{e.unit ? ` · ${e.unit.name}` : ""} · {formatDate(e.expense_date)}</div>
              </div>
              <div className="text-right font-semibold text-destructive">{formatMoney(Number(e.amount))}</div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-medium"><Wrench className="h-4 w-4 text-rust" /> Reparaciones / imprevistos</h2>
        <p className="mb-2 text-xs text-muted-foreground">Estos gastos no cuentan para el promedio mensual típico en Rentabilidad.</p>
        <div className="space-y-2">
          {repairsThisList.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Sin imprevistos registrados. Ojalá siga así.</Card>}
          {repairsThisList.slice(0, 40).map((e) => (
            <Card key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-l-4 border-l-rust p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{e.description ?? catLabel(e.category)}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{e.property?.name}{e.unit ? ` · ${e.unit.name}` : ""} · {formatDate(e.expense_date)}</div>
              </div>
              <div className="text-right font-semibold text-rust">{formatMoney(Number(e.amount))}</div>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar monto de este mes</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{confirmTarget?.description ?? catLabel(confirmTarget?.category ?? "")}</p>
            <Label>Monto real</Label>
            <Input type="number" step="0.01" value={confirmAmount} onChange={(e) => setConfirmAmount(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={saveConfirm}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
