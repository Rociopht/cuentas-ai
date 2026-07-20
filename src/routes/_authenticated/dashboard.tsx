import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Building2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const now = new Date();
  const [period] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string } | undefined;
      setName(meta?.full_name ?? data.user?.email?.split("@")[0] ?? "");
    });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", period.year, period.month],
    queryFn: () => fetchDashboard(period.year, period.month),
  });

  const greeting = greet();
  const monthName = new Date(period.year, period.month - 1, 1).toLocaleDateString("es-PE", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {greeting}{name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">Esto es lo importante de tus alquileres · <span className="capitalize">{monthName}</span></p>
      </header>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 md:p-8">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resultado de caja</div>
        {isLoading ? (
          <Skeleton className="mt-3 h-12 w-56" />
        ) : (
          <div className="mt-2 flex items-baseline gap-3">
            <div className="text-4xl font-semibold tracking-tight md:text-5xl">{formatMoney(data?.totals.result)}</div>
            {data && data.totals.result >= 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-success"><TrendingUp className="h-4 w-4" /> positivo</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-destructive"><TrendingDown className="h-4 w-4" /> negativo</span>
            )}
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Esperado" value={data?.totals.expected} loading={isLoading} />
          <Stat label="Cobrado" value={data?.totals.collected} loading={isLoading} tone="success" />
          <Stat label="Pendiente" value={data?.totals.pending} loading={isLoading} tone="warning" />
          <Stat label="Gastos" value={data?.totals.spent} loading={isLoading} tone="destructive" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Requiere tu atención</h2>
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="divide-y">
              <AttentionRow to="/charges" count={data?.counts.overdue ?? 0} label="cobros vencidos" tone="destructive" />
              <AttentionRow to="/payments" count={data?.counts.review ?? 0} label="pagos por revisar" tone="warning" />
              <AttentionRow to="/charges" count={data?.counts.partial ?? 0} label="pagos parciales" tone="warning" />
              <AttentionRow to="/properties" count={data?.counts.expiring ?? 0} label="contratos por vencer (30 días)" tone="muted" />
              {data && data.counts.overdue === 0 && data.counts.review === 0 && data.counts.partial === 0 && data.counts.expiring === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">Todo está al día ✓</div>
              )}
            </div>
          )}
        </Card>

        <Card className="border-accent/40 bg-accent/30 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide">Insight de Cuentas AI</span>
          </div>
          {isLoading || !data ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <p className="text-sm leading-relaxed">{buildInsight(data)}</p>
          )}
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Tus propiedades</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/properties">Ver todas <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
            : data?.properties.map((p) => (
                <Link key={p.id} to="/properties/$id" params={{ id: p.id }} className="group">
                  <Card className="h-full p-5 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4 shrink-0" /><span className="truncate text-xs">{p.address ?? ""}</span></div>
                        <h3 className="mt-1 truncate font-semibold">{p.name}</h3>
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{p.units} unid.</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <MiniStat label="Cobrado" v={p.collected} />
                      <MiniStat label="Pendiente" v={p.pending} />
                      <MiniStat label="Resultado" v={p.result} bold />
                    </div>
                  </Card>
                </Link>
              ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Acciones rápidas</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild variant="outline" className="h-auto justify-start py-3"><Link to="/payments">Registrar pago</Link></Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3"><Link to="/expenses">Registrar gasto</Link></Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3"><Link to="/properties">Agregar unidad</Link></Button>
          <Button asChild variant="outline" className="h-auto justify-start py-3"><Link to="/payments">Revisar pagos</Link></Button>
        </div>
      </section>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function Stat({ label, value, loading, tone }: { label: string; value?: number; loading?: boolean; tone?: "success" | "warning" | "destructive" }) {
  const cls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? <Skeleton className="mt-1 h-6 w-20" /> : <div className={"mt-1 text-lg font-semibold " + cls}>{formatMoney(value)}</div>}
    </div>
  );
}

function MiniStat({ label, v, bold }: { label: string; v: number; bold?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={"mt-0.5 " + (bold ? "font-semibold" : "")}>{formatMoney(v)}</div>
    </div>
  );
}

function AttentionRow({ to, count, label, tone }: { to: string; count: number; label: string; tone: "destructive" | "warning" | "muted" }) {
  if (count === 0) return null;
  const cls = tone === "destructive" ? "bg-destructive/10 text-destructive" : tone === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-muted text-muted-foreground";
  return (
    <Link to={to} className="flex items-center justify-between py-3 hover:opacity-80">
      <div className="flex items-center gap-3">
        <span className={"grid h-8 w-8 place-items-center rounded-full text-sm font-semibold " + cls}>{count}</span>
        <span className="text-sm">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function buildInsight(d: { totals: { expected: number; collected: number; pending: number; spent: number }; counts: { overdue: number; review: number } }): string {
  const { expected, collected, pending, spent } = d.totals;
  if (d.counts.overdue > 0) return `Tienes ${d.counts.overdue} ${d.counts.overdue === 1 ? "cobro vencido" : "cobros vencidos"} por un total de ${formatMoney(pending)}.`;
  if (d.counts.review > 0) return `Tienes ${d.counts.review} ${d.counts.review === 1 ? "pago" : "pagos"} por revisar. Confirma cuáles corresponden a cada unidad.`;
  if (expected > 0 && collected < expected) return `Este mes vas ${formatMoney(expected - collected)} por debajo de lo esperado (${Math.round((collected/expected)*100)}% cobrado).`;
  if (spent > 0 && collected > 0) return `Cobraste ${formatMoney(collected)} y gastaste ${formatMoney(spent)}. Resultado positivo del mes.`;
  return "Todo parece estar al día. Buen momento para revisar contratos próximos a vencer.";
}