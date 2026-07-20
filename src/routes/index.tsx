import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Home, Wallet, LineChart, BellRing } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  const [checking, setChecking] = useState(true);
  useEffect(() => setChecking(false), []);
  if (checking) return null;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">C</div>
          <span className="font-semibold tracking-tight">Cuentas AI</span>
        </div>
        <Button asChild variant="ghost"><Link to="/auth">Ingresar</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-20">
        <div className="max-w-3xl">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">Para propietarios independientes</span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            Sabé exactamente qué está pasando con tus alquileres.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Cuentas AI reemplaza los WhatsApps, capturas de Yape y hojas de Excel.
            Cobros, pagos, gastos y rentabilidad en un solo lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth">Empezar ahora</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth" search={{ demo: "1" } as never}>Ver demo con datos</Link></Button>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-4">
          {[
            { icon: Home, t: "Propiedades y unidades", d: "Todos tus alquileres organizados por propiedad." },
            { icon: Wallet, t: "Cobros y pagos", d: "Registra parciales, adelantados y confirma cada pago." },
            { icon: LineChart, t: "Rentabilidad real", d: "Resultado de caja por propiedad y por unidad." },
            { icon: BellRing, t: "Qué revisar hoy", d: "Alertas de vencimientos, atrasos y contratos por vencer." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-medium">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}