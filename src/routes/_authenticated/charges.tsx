import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, monthLabel, CHARGE_STATUS_COLOR, CHARGE_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/charges")({
  component: Charges,
});

function Charges() {
  const { data, isLoading } = useQuery({
    queryKey: ["charges-all"],
    queryFn: async () => {
      const [c, a] = await Promise.all([
        supabase.from("charges").select("id, period_year, period_month, amount_expected, status, due_date, unit:units(name, property:properties(name)), tenant:tenants(full_name)").order("due_date", { ascending: false }).limit(200),
        supabase.from("payment_allocations").select("charge_id, amount_allocated"),
      ]);
      const paid = new Map<string, number>();
      for (const x of a.data ?? []) paid.set(x.charge_id, (paid.get(x.charge_id) ?? 0) + Number(x.amount_allocated));
      return (c.data ?? []).map((r) => ({ ...r, paid: paid.get(r.id) ?? 0 }));
    },
  });

  const overdue = data?.filter((c) => c.status === "overdue") ?? [];
  const pending = data?.filter((c) => c.status === "pending" || c.status === "partial") ?? [];
  const paid = data?.filter((c) => c.status === "paid") ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cobros</h1>
        <p className="text-muted-foreground">Se generan automáticamente cada mes por unidad activa.</p>
      </header>

      <Tabs defaultValue="overdue">
        <TabsList>
          <TabsTrigger value="overdue">Vencidos ({overdue.length})</TabsTrigger>
          <TabsTrigger value="pending">Por cobrar ({pending.length})</TabsTrigger>
          <TabsTrigger value="paid">Pagados ({paid.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overdue"><ChargeList items={overdue} loading={isLoading} empty="Sin cobros vencidos. ¡Bien hecho!" /></TabsContent>
        <TabsContent value="pending"><ChargeList items={pending} loading={isLoading} empty="No hay cobros pendientes." /></TabsContent>
        <TabsContent value="paid"><ChargeList items={paid} loading={isLoading} empty="Aún no hay cobros pagados." /></TabsContent>
      </Tabs>
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
                {c.tenant?.full_name ?? "—"} · {monthLabel(c.period_month)} {c.period_year} · vence {new Date(c.due_date).toLocaleDateString("es-PE")}
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