import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, LineChart, Activity as ActivityIcon, LogOut, ChevronRight, Building2, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/more")({
  component: More,
});

const ITEMS = [
  { to: "/properties", icon: Building2, label: "Propiedades" },
  { to: "/communications", icon: MessageSquare, label: "Comunicaciones" },
  { to: "/expenses", icon: Receipt, label: "Gastos" },
  { to: "/profitability", icon: LineChart, label: "Rentabilidad" },
  { to: "/activity", icon: ActivityIcon, label: "Actividad" },
] as const;

function More() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Más</h1>
      <Card className="divide-y overflow-hidden">
        {ITEMS.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex items-center justify-between p-4 hover:bg-accent/30">
            <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-muted-foreground" /><span>{label}</span></div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </Card>
      <Button variant="outline" className="w-full" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</Button>
    </div>
  );
}