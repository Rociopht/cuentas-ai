import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Wallet, Receipt, FileText, Building2, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/activity")({
  component: Activity,
});

const ICONS: Record<string, typeof Wallet> = {
  payment: Wallet, expense: Receipt, charge: FileText, property: Building2, contract: User,
};

function Activity() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Actividad</h1>
        <p className="text-muted-foreground">Todo lo que sucede en tu portafolio.</p>
      </header>
      {isLoading && <div className="text-muted-foreground">Cargando…</div>}
      <div className="space-y-2">
        {data?.map((a) => {
          const Icon = ICONS[a.entity_type] ?? FileText;
          return (
            <Card key={a.id} className="flex items-start gap-3 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/60 text-accent-foreground"><Icon className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{a.description}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("es-PE")}</div>
              </div>
            </Card>
          );
        })}
        {data && data.length === 0 && <Card className="p-8 text-center text-muted-foreground">Sin actividad aún.</Card>}
      </div>
    </div>
  );
}