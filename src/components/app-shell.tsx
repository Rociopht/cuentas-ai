import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Building2, Wallet, CalendarDays, MessageSquare, Receipt, LineChart, MoreHorizontal, LogOut, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", icon: Home, label: "Inicio" },
  { to: "/calendar", icon: CalendarDays, label: "Calendario" },
  { to: "/properties", icon: Building2, label: "Propiedades" },
  { to: "/charges", icon: Wallet, label: "Cobros" },
  { to: "/communications", icon: MessageSquare, label: "Comunicaciones" },
  { to: "/expenses", icon: Receipt, label: "Gastos" },
  { to: "/profitability", icon: LineChart, label: "Rentabilidad" },
  { to: "/activity", icon: Activity, label: "Actividad" },
] as const;

const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[4]] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

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
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </aside>

      <main className="md:ml-60 pb-20 md:pb-0">
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