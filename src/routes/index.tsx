import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, LineChart, Wallet, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">C</div>
          <span className="font-semibold">Cuentas AI</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Ingresar</Link></Button>
          <Button asChild size="sm"><Link to="/auth">Empezar</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 md:pt-20">
        <section className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border bg-accent/40 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Copiloto financiero para propietarios
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            La cuenta clara <span className="text-primary">de tus alquileres.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Cobros, pagos parciales, gastos y rentabilidad real por propiedad. Un copiloto que te explica dónde vas ganando y dónde estás perdiendo dinero.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth">Crear mi cuenta <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth" search={{ demo: "1" }}>Ver demo con datos reales</Link></Button>
          </div>
        </section>

        <section className="mt-20 grid gap-4 md:grid-cols-3">
          <Feature icon={Building2} title="Todo tu portafolio" desc="Propiedades, unidades, inquilinos y contratos en un solo lugar, con estado de ocupación en tiempo real." />
          <Feature icon={Wallet} title="Cobros que no se pierden" desc="Se generan mes a mes automáticamente. Soporta pagos parciales, adelantados y con recargo." />
          <Feature icon={LineChart} title="Rentabilidad real" desc="Ingresos cobrados menos gastos pagados por propiedad y por unidad. Sin proyecciones infladas." />
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-muted-foreground">© {new Date().getFullYear()} Cuentas AI</div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Building2; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}