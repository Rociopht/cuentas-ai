import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Building2, Wallet, CalendarDays, MessageSquare, Receipt, LineChart, MoreHorizontal, LogOut, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/hooks/use-demo";
import type { ReactNode } from "react";


const NAV = [
  { to: "/dashboard", icon: Home, label: "Inicio" },
  { to: "/properties", icon: Building2, label: "Propiedades" },
  { to: "/charges", icon: Wallet, label: "Cobros" },
  { to: "/expenses", icon: Receipt, label: "Gastos" },
] as const;

const NAV_SECONDARY = [
  { to: "/calendar", icon: CalendarDays, label: "Calendario" },
  { to: "/profitability", icon: LineChart, label: "Rentabilidad" },
  { to: "/activity", icon: Activity, label: "Actividad" },
] as const;

const MOBILE_NAV = NAV;


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isDemo = useDemoMode();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">C</div>
          <span className="font-semibold tracking-tight">Cuentas AI</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <div className="pt-4 pb-1 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Análisis</div>
          {NAV_SECONDARY.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </aside>

      <main className="md:ml-60 pb-20 md:pb-0">
        {isDemo && (
          <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning/15 px-4 py-2 text-sm md:px-8">
            <span className="text-warning-foreground">
              Estás viendo el <strong>demo</strong> con datos de ejemplo. Nada de lo que hagas aquí es real.
            </span>
            <Button size="sm" variant="outline" className="h-8" onClick={signOut}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Salir del demo
            </Button>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t bg-sidebar md:hidden">
        {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
        <Link to="/more" className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px]", pathname === "/more" ? "text-primary" : "text-muted-foreground")}>
          <MoreHorizontal className="h-5 w-5" />
          Más
        </Link>
      </nav>
    </div>
  );
}