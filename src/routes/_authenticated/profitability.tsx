import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profitability")({
  component: Profitability,
});

function Profitability() {
  const { data, isLoading } = useQuery({
    queryKey: ["profitability"],
    queryFn: async () => {
      const [props, units, charges, allocs, expenses] = await Promise.all([
        supabase.from("properties").select("id, name"),
        supabase.from("units").select("id, name, property_id"),
        supabase.from("charges").select("id, unit_id"),
        supabase.from("payment_allocations").select("charge_id, amount_allocated"),
        supabase.from("expenses").select("amount, property_id, unit_id"),
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
      for (const e of expenses.data ?? []) if (e.unit_id) { const u = perUnit.get(e.unit_id); if (u) u.spent += Number(e.amount); }
      const perProperty = new Map<string, { id: string; name: string; collected: number; spent: number }>();
      for (const p of props.data ?? []) perProperty.set(p.id, { id: p.id, name: p.name, collected: 0, spent: 0 });
      for (const [, u] of perUnit) {
        const propId = unitById.get(u.id)?.property_id;
        const pp = propId ? perProperty.get(propId) : undefined;
        if (pp) { pp.collected += u.collected; pp.spent += u.spent; }
      }
      for (const e of expenses.data ?? []) if (!e.unit_id) { const pp = perProperty.get(e.property_id); if (pp) pp.spent += Number(e.amount); }
      const properties = Array.from(perProperty.values()).map((p) => ({ ...p, result: p.collected - p.spent })).sort((a, b) => b.result - a.result);
      const unitsList = Array.from(perUnit.values()).map((u) => ({ ...u, result: u.collected - u.spent })).sort((a, b) => b.result - a.result);
      return { properties, units: unitsList };
    },
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Cargando…</div>;
  const totalResult = data.properties.reduce((s, p) => s + p.result, 0);
  const totalCollected = data.properties.reduce((s, p) => s + p.collected, 0);
  const totalSpent = data.properties.reduce((s, p) => s + p.spent, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Rentabilidad</h1>
        <p className="text-muted-foreground">Ingresos cobrados menos gastos pagados. Cifras reales.</p>
      </header>
      <Card className="p-6">
        <div className="text-xs uppercase text-muted-foreground">Resultado acumulado</div>
        <div className={"mt-1 text-4xl font-semibold " + (totalResult >= 0 ? "text-success" : "text-destructive")}>{formatMoney(totalResult)}</div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Ingresos:</span> <span className="font-medium">{formatMoney(totalCollected)}</span></div>
          <div><span className="text-muted-foreground">Gastos:</span> <span className="font-medium">{formatMoney(totalSpent)}</span></div>
        </div>
      </Card>
      <section>
        <h2 className="mb-3 font-medium">Por propiedad</h2>
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
    </div>
  );
}