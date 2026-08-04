import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, Receipt } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { fetchMonthSchedule, daysUntil } from "@/lib/schedule";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarView,
  head: () => ({
    meta: [
      { title: "Calendario de cobros y gastos · Cuentas AI" },
      { name: "description", content: "Mira día por día qué unidad debe pagar, qué cobros están vencidos y qué gastos fijos vencen este mes." },
      { property: "og:title", content: "Calendario de cobros y gastos · Cuentas AI" },
      { property: "og:description", content: "Cobros pagados, por vencer, vencidos y gastos fijos en un solo calendario mensual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const WEEK = ["L", "M", "M", "J", "V", "S", "D"];

function CalendarView() {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selected, setSelected] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ["schedule", cursor.year, cursor.month],
    queryFn: () => fetchMonthSchedule(cursor.year, cursor.month),
  });

  const first = new Date(cursor.year, cursor.month - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(cursor.year, cursor.month, 0).getDate();
  const monthName = first.toLocaleDateString("es-PE", { month: "long", year: "numeric" });

  function move(delta: number) {
    const d = new Date(cursor.year, cursor.month - 1 + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() + 1 });
    setSelected(null);
  }

  const dayCharges = (d: number) => data?.charges.filter((c) => c.day === d) ?? [];
  const dayExpenses = (d: number) => data?.expenses.filter((e) => e.day === d) ?? [];

  const cs = data?.charges ?? [];
  const es = data?.expenses ?? [];
  const diffOf = (day: number) => daysUntil(cursor.year, cursor.month, day);
  const cobrado = cs.filter((c) => c.status === "paid");
  const atrasado = cs.filter((c) => c.status !== "paid" && diffOf(c.day) < 0);
  const proximo = cs.filter((c) => c.status !== "paid" && diffOf(c.day) >= 0);
  const sum = (arr: { expected: number; paid: number }[], field: "expected" | "paid") => arr.reduce((s, x) => s + x[field], 0);
  const guide = [
    { icon: CheckCircle2, cls: "bg-success", text: "text-success", title: "Ya te pagaron", count: cobrado.length, amount: sum(cobrado, "expected"), hint: "alquileres cobrados este mes" },
    { icon: Clock, cls: "bg-warning", text: "text-warning-foreground", title: "Te pagan pronto", count: proximo.length, amount: sum(proximo, "expected") - sum(proximo, "paid"), hint: "cobros que aún no llegan a su fecha" },
    { icon: AlertTriangle, cls: "bg-destructive", text: "text-destructive", title: "Te deben desde antes", count: atrasado.length, amount: sum(atrasado, "expected") - sum(atrasado, "paid"), hint: "ya pasó su fecha y no llegó el dinero" },
    { icon: Receipt, cls: "bg-rust", text: "text-rust", title: "Tú tienes que pagar", count: es.length, amount: es.reduce((s, e) => s + e.amount, 0), hint: "luz, agua, internet y otros gastos fijos" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario</h1>
          <p className="text-muted-foreground">Cada unidad paga en su día fijo. Aquí lo ves de un golpe.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-40 text-center text-sm font-medium capitalize">{monthName}</span>
          <Button variant="outline" size="icon" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {guide.map((g) => (
          <Card key={g.title} className="p-4">
            <div className="flex items-center gap-2">
              <span className={"h-2.5 w-2.5 rounded-full " + g.cls} />
              <g.icon className={"h-4 w-4 " + g.text} />
              <span className="text-sm font-medium">{g.title}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-semibold">{formatMoney(g.amount)}</span>
              <span className="text-xs text-muted-foreground">{g.count} {g.count === 1 ? "caso" : "casos"}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{g.hint}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Los puntos de cada día usan estos mismos colores. Toca un día para ver el detalle.</p>

      <Card className="p-3 md:p-5">
        <div className="mb-2 grid grid-cols-7 text-center text-[11px] uppercase text-muted-foreground">
          {WEEK.map((w, i) => <div key={i}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {Array.from({ length: offset }).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
            const cs = dayCharges(d);
            const es = dayExpenses(d);
            const diff = daysUntil(cursor.year, cursor.month, d);
            const isToday = diff === 0;
            const dots: string[] = [];
            for (const c of cs) {
              if (c.status === "paid") dots.push("bg-success");
              else if (diff < 0) dots.push("bg-destructive");
              else if (diff <= 5) dots.push("bg-warning");
              else dots.push("bg-muted-foreground/40");
            }
            if (es.length) dots.push("bg-rust");
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={
                  "flex min-h-16 flex-col items-center rounded-lg border p-1.5 text-xs transition-colors hover:bg-accent/40 md:min-h-20 " +
                  (isToday ? "border-primary bg-primary/5" : "border-border")
                }
              >
                <span className={isToday ? "font-semibold text-primary" : "text-muted-foreground"}>{d}</span>
                <span className="mt-1 flex flex-wrap justify-center gap-1">
                  {dots.slice(0, 6).map((c, i) => <span key={i} className={"h-1.5 w-1.5 rounded-full " + c} />)}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {selected ? new Date(cursor.year, cursor.month - 1, selected).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" }) : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 px-4 pb-6">
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dinero que debes recibir</h3>
              <div className="space-y-2">
                {selected && dayCharges(selected).length === 0 && <p className="text-sm text-muted-foreground">Nadie te tiene que pagar este día.</p>}
                {selected && dayCharges(selected).map((c) => (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{c.property} · {c.unit}</div>
                        <div className="text-xs text-muted-foreground">{c.tenant}</div>
                      </div>
                      <Badge className={c.status === "paid" ? "bg-success/15 text-success border border-success/30" : c.status === "overdue" ? "bg-destructive/10 text-destructive border border-destructive/30" : "bg-warning/15 text-warning-foreground border border-warning/30"}>
                        {c.status === "paid" ? "Ya te pagó" : c.status === "overdue" ? "Te debe" : c.status === "partial" ? "Pagó una parte" : "Te paga pronto"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      {formatMoney(c.expected)}
                      {c.paid > 0 && c.paid < c.expected && <span className="text-muted-foreground"> · pagado {formatMoney(c.paid)}</span>}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dinero que tú debes pagar</h3>
              <div className="space-y-2">
                {selected && dayExpenses(selected).length === 0 && <p className="text-sm text-muted-foreground">No tienes gastos fijos este día.</p>}
                {selected && dayExpenses(selected).map((e) => (
                  <Card key={e.id} className="border-l-4 border-l-rust p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{e.description ?? e.category}</div>
                        <div className="text-xs text-muted-foreground">{e.property}</div>
                      </div>
                      <div className="text-sm font-semibold text-rust">{formatMoney(e.amount)}</div>
                    </div>
                    {!e.confirmed && <div className="mt-1 text-[11px] text-rust">Monto por confirmar</div>}
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
