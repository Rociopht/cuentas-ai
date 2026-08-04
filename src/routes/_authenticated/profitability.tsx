import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";
import { fetchMonthlySeries, bucketize, type Grain } from "@/lib/analytics";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/profitability")({
  component: Profitability,
  head: () => ({
    meta: [
      { title: "Rentabilidad mensual, trimestral y anual · Cuentas AI" },
      { name: "description", content: "Compara ingresos, gastos y resultado por mes, trimestre o año, con ranking de propiedades y unidades." },
      { property: "og:title", content: "Rentabilidad mensual, trimestral y anual · Cuentas AI" },
      { property: "og:description", content: "Tu resultado real por periodo, sin distorsión de imprevistos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const GRAIN_LABEL: Record<Grain, string> = { month: "Mensual", quarter: "Trimestral", year: "Anual" };

function Profitability() {
  const [grain, setGrain] = useState<Grain>("month");

  const { data: series } = useQuery({ queryKey: ["monthly-series-24"], queryFn: () => fetchMonthlySeries(24) });

  const { data, isLoading } = useQuery({
    queryKey: ["profitability"],
    queryFn: async () => {
      const [props, units, charges, allocs, expenses] = await Promise.all([
        supabase.from("properties").select("id, name"),
        supabase.from("units").select("id, name, property_id"),
        supabase.from("charges").select("id, unit_id"),
        supabase.from("payment_allocations").select("charge_id, amount_allocated"),
        supabase.from("expenses").select("amount, property_id, unit_id, expense_type"),
      ]);
      const chargeById = new Map((charges.data ?? []).map((c) => [c.id, c]));
      const unitById = new Map((units.data ?? []).map((u) => [u.id, u]));
      const perUnit = new Map<string, { id: string; name: string; property: string; collected: number; spent: number }>();
      for (const u of units.data ?? []) {
        const prop = (props.data ?? []).find((p) => p.id === u.property_id)?.name ?? "";
        perUnit.set(u.id, { id: u.id, name: u.name, property: prop, collected: 0, spent: 0 });
      }
      for (const a of allocs.data ?? []) {
        const c = chargeById.get(a.charge_id); if (!c) continue;
        const u = perUnit.get(c.unit_id); if (u) u.collected += Number(a.amount_allocated);
      }
      const typical = (expenses.data ?? []).filter((e) => e.expense_type !== "reparacion");
      const repairs = (expenses.data ?? []).filter((e) => e.expense_type === "reparacion");
      for (const e of typical) if (e.unit_id) { const u = perUnit.get(e.unit_id); if (u) u.spent += Number(e.amount); }
      const perProperty = new Map<string, { id: string; name: string; collected: number; spent: number }>();
      for (const p of props.data ?? []) perProperty.set(p.id, { id: p.id, name: p.name, collected: 0, spent: 0 });
      for (const [, u] of perUnit) {
        const propId = unitById.get(u.id)?.property_id;
        const pp = propId ? perProperty.get(propId) : undefined;
        if (pp) { pp.collected += u.collected; pp.spent += u.spent; }
      }
      for (const e of typical) if (!e.unit_id) { const pp = perProperty.get(e.property_id); if (pp) pp.spent += Number(e.amount); }
      const properties = Array.from(perProperty.values()).map((p) => ({ ...p, result: p.collected - p.spent })).sort((a, b) => b.result - a.result);
      const unitsList = Array.from(perUnit.values()).map((u) => ({ ...u, result: u.collected - u.spent })).sort((a, b) => b.result - a.result);
      return { properties, units: unitsList, repairsTotal: repairs.reduce((s, e) => s + Number(e.amount), 0) };
    },
  });

  const buckets = bucketize(series ?? [], grain).filter((b) => b.collected > 0 || b.expenses > 0);
  const shown = grain === "month" ? buckets.slice(-12) : buckets;
  const current = shown[shown.length - 1];
  const previous = shown[shown.length - 2];
  const margin = current && current.collected > 0 ? Math.round((current.result / current.collected) * 100) : 0;
  const delta = current && previous && previous.result !== 0 ? Math.round(((current.result - previous.result) / Math.abs(previous.result)) * 100) : null;
  const chartData = shown.map((b) => ({ label: b.label, Ingresos: Math.round(b.collected), Gastos: Math.round(b.expenses), Resultado: Math.round(b.result) }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rentabilidad</h1>
          <p className="text-muted-foreground">Lo que entró menos lo que salió, por periodo.</p>
        </div>
        <Tabs value={grain} onValueChange={(v) => setGrain(v as Grain)}>
          <TabsList>
            {(Object.keys(GRAIN_LABEL) as Grain[]).map((g) => (
              <TabsTrigger key={g} value={g}>{GRAIN_LABEL[g]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Resultado · {current?.label ?? "—"}</div>
          <div className={"mt-1 text-3xl font-semibold " + ((current?.result ?? 0) >= 0 ? "text-success" : "text-destructive")}>{formatMoney(current?.result ?? 0)}</div>
          {delta !== null && (
            <div className={"mt-1 inline-flex items-center gap-1 text-xs " + (delta >= 0 ? "text-success" : "text-destructive")}>
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta > 0 ? "+" : ""}{delta}% vs. {previous?.label}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Margen del periodo</div>
          <div className="mt-1 text-3xl font-semibold">{margin}%</div>
          <p className="mt-1 text-xs text-muted-foreground">Ingresos {formatMoney(current?.collected ?? 0)} · Gastos {formatMoney(current?.expenses ?? 0)}</p>
        </Card>
        <Card className="border-l-4 border-l-rust p-5">
          <div className="text-xs uppercase text-muted-foreground">Imprevistos del periodo</div>
          <div className="mt-1 text-3xl font-semibold text-rust">{formatMoney(current?.repairs ?? 0)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Acumulado histórico {formatMoney(data?.repairsTotal ?? 0)}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="text-xs uppercase text-muted-foreground">Evolución {GRAIN_LABEL[grain].toLowerCase()}</div>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={54} tickFormatter={(v: number) => "S/ " + Math.round(v / 1000) + "k"} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Bar dataKey="Ingresos" fill="var(--primary)" radius={4} />
              <Bar dataKey="Gastos" fill="var(--destructive)" opacity={0.7} radius={4} />
              <Line type="monotone" dataKey="Resultado" stroke="var(--rust)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {isLoading || !data ? (
        <div className="text-muted-foreground">Cargando…</div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-medium">Por propiedad (acumulado)</h2>
            <div className="space-y-2">
              {data.properties.map((p) => (
                <Card key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Ingresos {formatMoney(p.collected)} · Gastos {formatMoney(p.spent)}</div>
                  </div>
                  <div className={"flex items-center gap-2 font-semibold " + (p.result >= 0 ? "text-success" : "text-destructive")}>
                    {p.result >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {formatMoney(p.result)}
                  </div>
                </Card>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 font-medium">Top unidades</h2>
            <div className="space-y-2">
              {data.units.slice(0, 10).map((u) => (
                <Card key={u.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{u.property} · {u.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Ingresos {formatMoney(u.collected)} · Gastos {formatMoney(u.spent)}</div>
                  </div>
                  <div className={"font-semibold " + (u.result >= 0 ? "text-success" : "text-destructive")}>{formatMoney(u.result)}</div>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
