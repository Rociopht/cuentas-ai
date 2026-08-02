import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { fetchCommTargets, draftMessage, type CommTarget } from "@/lib/schedule";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/communications")({
  component: Communications,
  head: () => ({
    meta: [
      { title: "Comunicaciones con inquilinos · Cuentas AI" },
      { name: "description", content: "Borradores de mensajes listos para cobrar alquileres: la IA prepara, tú revisas, editas y envías por WhatsApp." },
      { property: "og:title", content: "Comunicaciones con inquilinos · Cuentas AI" },
      { property: "og:description", content: "Mensajes de cobro redactados y editables. El envío siempre lo decides tú." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Communications() {
  const { data, isLoading } = useQuery({ queryKey: ["comm-targets"], queryFn: fetchCommTargets });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Comunicaciones</h1>
        <p className="text-muted-foreground">Borradores listos para cada cobro pendiente. Tú revisas, editas y envías.</p>
      </header>

      <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>Cuentas AI nunca envía mensajes por ti. Prepara el borrador, tú lo apruebas y lo pegas en WhatsApp.</p>
      </Card>

      {isLoading && <div className="text-muted-foreground">Cargando…</div>}
      {data && data.length === 0 && (
        <Card className="p-10 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">No hay cobros pendientes. Nada que comunicar hoy.</p>
        </Card>
      )}
      <div className="space-y-3">
        {data?.map((t) => <CommCard key={t.chargeId} t={t} />)}
      </div>
    </div>
  );
}

function CommCard({ t }: { t: CommTarget }) {
  const [text, setText] = useState(() => draftMessage(t));
  const [sent, setSent] = useState(false);
  const overdue = t.daysLate > 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensaje copiado. Pégalo en WhatsApp.");
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto manualmente.");
    }
  }

  async function markSent() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("activity_log").insert({
      owner_id: userData.user.id,
      action_type: "message_sent",
      entity_type: "charge",
      entity_id: t.chargeId,
      description: `Mensaje de cobro enviado a ${t.tenant} (${t.unit}) por ${formatMoney(t.remaining)}`,
      metadata: { days_late: t.daysLate, message: text },
    });
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Registrado en Actividad");
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{t.property} · {t.unit}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{t.tenant}{t.phone ? ` · ${t.phone}` : ""} · pendiente {formatMoney(t.remaining)}</div>
        </div>
        <Badge className={overdue ? "bg-destructive/10 text-destructive border border-destructive/30" : "bg-warning/15 text-warning-foreground border border-warning/30"}>
          {overdue ? `${t.daysLate} ${t.daysLate === 1 ? "día" : "días"} de atraso` : t.daysToDue === 0 ? "Vence hoy" : `Vence en ${t.daysToDue} ${t.daysToDue === 1 ? "día" : "días"}`}
        </Badge>
      </div>
      <Textarea className="mt-3 min-h-32 text-sm" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}><Copy className="mr-1.5 h-4 w-4" />Copiar mensaje</Button>
        <Button size="sm" variant="outline" onClick={markSent} disabled={sent}>
          <Check className="mr-1.5 h-4 w-4" />{sent ? "Marcado como enviado" : "Marcar como enviado"}
        </Button>
      </div>
    </Card>
  );
}