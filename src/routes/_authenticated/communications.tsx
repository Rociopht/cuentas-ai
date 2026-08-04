import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Check, MessageSquare, ShieldCheck, History, ChevronDown, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import { fetchCommTargets, fetchCommHistory, draftMessage, type CommTarget, type CommEvent } from "@/lib/schedule";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/communications")({
  component: Communications,
  head: () => ({
    meta: [
      { title: "Comunicaciones con inquilinos · Cuentas AI" },
      { name: "description", content: "Borradores de cobro listos e historial por contacto: qué le escribiste, cuándo y en qué quedaron." },
      { property: "og:title", content: "Comunicaciones con inquilinos · Cuentas AI" },
      { property: "og:description", content: "Mensajes de cobro editables e historial de conversación por inquilino. El envío siempre lo decides tú." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Communications() {
  const { data, isLoading } = useQuery({ queryKey: ["comm-targets"], queryFn: fetchCommTargets });
  const { data: history } = useQuery({ queryKey: ["comm-history"], queryFn: fetchCommHistory });

  const byTenant = useMemo(() => {
    const m = new Map<string, CommEvent[]>();
    for (const e of history ?? []) {
      const k = e.tenantId ?? "sin-contacto";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return m;
  }, [history]);

  const contactNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of data ?? []) if (t.tenantId) m.set(t.tenantId, `${t.tenant} · ${t.unit}`);
    return m;
  }, [data]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Comunicaciones</h1>
        <p className="text-muted-foreground">Borradores por cobrar e historial de cada contacto.</p>
      </header>

      <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>Cuentas AI nunca envía mensajes por ti. Prepara el borrador, tú lo apruebas y lo pegas en WhatsApp.</p>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending"><MessageSquare className="mr-1.5 h-4 w-4" />Por escribir ({data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1.5 h-4 w-4" />Historial ({history?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {isLoading && <div className="text-muted-foreground">Cargando…</div>}
          {data && data.length === 0 && (
            <Card className="p-10 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">No hay cobros pendientes. Nada que comunicar hoy.</p>
            </Card>
          )}
          {data?.map((t) => (
            <CommCard key={t.chargeId} t={t} events={t.tenantId ? byTenant.get(t.tenantId) ?? [] : []} />
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {(history?.length ?? 0) === 0 && (
            <Card className="p-10 text-center text-muted-foreground">Todavía no registras conversaciones.</Card>
          )}
          {Array.from(byTenant.entries()).map(([tenantId, events]) => (
            <Card key={tenantId} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{contactNames.get(tenantId) ?? events[0]?.description.split(" a ")[1]?.split(" (")[0] ?? "Contacto"}</div>
                <span className="text-xs text-muted-foreground">
                  Último contacto: {new Date(events[0]!.createdAt).toLocaleDateString("es-PE")}
                </span>
              </div>
              <Timeline events={events} />
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Timeline({ events }: { events: CommEvent[] }) {
  return (
    <ol className="mt-3 space-y-3 border-l pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className={"absolute -left-[21px] top-1.5 h-2 w-2 rounded-full " + (e.kind === "comm_note" ? "bg-primary" : "bg-warning")} />
          <div className="text-xs text-muted-foreground">
            {new Date(e.createdAt).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} ·{" "}
            {e.kind === "comm_note" ? "En qué quedaron" : "Mensaje enviado"}
          </div>
          <div className="text-sm">{e.description}</div>
        </li>
      ))}
    </ol>
  );
}

function CommCard({ t, events }: { t: CommTarget; events: CommEvent[] }) {
  const qc = useQueryClient();
  const [text, setText] = useState(() => draftMessage(t));
  const [note, setNote] = useState("");
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

  async function log(action: "message_sent" | "comm_note", description: string, extra: Record<string, unknown>) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    const { error } = await supabase.from("activity_log").insert({
      owner_id: userData.user.id,
      action_type: action,
      entity_type: "tenant",
      entity_id: t.tenantId,
      description,
      metadata: { tenant_id: t.tenantId, charge_id: t.chargeId, days_late: t.daysLate, ...extra },
    });
    if (error) { toast.error(error.message); return false; }
    await qc.invalidateQueries({ queryKey: ["comm-history"] });
    return true;
  }

  async function markSent() {
    const ok = await log("message_sent", `Mensaje de cobro enviado a ${t.tenant} (${t.unit}) por ${formatMoney(t.remaining)}`, { message: text });
    if (ok) { setSent(true); toast.success("Registrado en el historial"); }
  }

  async function saveNote() {
    if (!note.trim()) return;
    const ok = await log("comm_note", `${t.tenant} (${t.unit}): ${note.trim()}`, { note: note.trim() });
    if (ok) { setNote(""); toast.success("Anotado en el historial"); }
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

      <div className="mt-3 flex gap-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="¿En qué quedaron? Ej: paga el viernes" />
        <Button size="sm" variant="outline" onClick={saveNote} disabled={!note.trim()}><StickyNote className="mr-1.5 h-4 w-4" />Anotar</Button>
      </div>

      <Collapsible className="mt-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
            <ChevronDown className="mr-1.5 h-4 w-4" />Historial con {t.tenant} ({events.length})
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {events.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sin contactos previos registrados.</p>
          ) : (
            <Timeline events={events} />
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
