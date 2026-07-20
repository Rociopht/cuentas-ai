import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatMoney, monthLabel } from "@/lib/format";
import { Plus, CheckCircle2, Inbox } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payments")({
  component: Payments,
});

function Payments() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", payment_date: new Date().toISOString().slice(0, 10), payment_method: "transfer", unit_id: "", charge_id: "", notes: "" });

  const { data } = useQuery({
    queryKey: ["payments-page"],
    queryFn: async () => {
      const [payments, units, charges] = await Promise.all([
        supabase.from("payments").select("id, amount, payment_date, payment_method, status, notes, unit:units(name, property:properties(name)), tenant:tenants(full_name)").order("payment_date", { ascending: false }).limit(60),
        supabase.from("units").select("id, name, status, property:properties(name)").order("name"),
        supabase.from("charges").select("id, unit_id, period_year, period_month, amount_expected, status").in("status", ["pending", "partial", "overdue"]).order("due_date"),
      ]);
      return { payments: payments.data ?? [], units: units.data ?? [], charges: charges.data ?? [] };
    },
  });

  async function createPayment() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !form.unit_id) return;
    const amount = Number(form.amount);
    if (!(amount > 0)) { toast.error("Monto inválido"); return; }
    const { data: pay, error } = await supabase.from("payments").insert({
      owner_id: userData.user.id,
      amount,
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      unit_id: form.unit_id,
      notes: form.notes || null,
      status: form.charge_id ? "confirmed" : "pending_review",
    }).select().single();
    if (error || !pay) { toast.error(error?.message ?? "Error"); return; }
    if (form.charge_id) {
      const c = data?.charges.find((x) => x.id === form.charge_id);
      const alloc = Math.min(amount, Number(c?.amount_expected ?? amount));
      const { error: aErr } = await supabase.from("payment_allocations").insert({
        owner_id: userData.user.id,
        payment_id: pay.id,
        charge_id: form.charge_id,
        amount_allocated: alloc,
      });
      if (aErr) toast.error(aErr.message);
      else await supabase.rpc("recalc_charge_status", { _charge_id: form.charge_id });
    }
    toast.success("Pago registrado");
    setOpen(false);
    setForm({ amount: "", payment_date: new Date().toISOString().slice(0, 10), payment_method: "transfer", unit_id: "", charge_id: "", notes: "" });
    qc.invalidateQueries();
  }

  async function confirmPayment(id: string) {
    const { error } = await supabase.from("payments").update({ status: "confirmed" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Confirmado");
    qc.invalidateQueries({ queryKey: ["payments-page"] });
  }

  const review = data?.payments.filter((p) => p.status === "pending_review") ?? [];
  const confirmed = data?.payments.filter((p) => p.status !== "pending_review") ?? [];
  const unitCharges = data?.charges.filter((c) => c.unit_id === form.unit_id) ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">Registra ingresos y concilia con los cobros correspondientes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Registrar pago</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Unidad</Label>
                <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v, charge_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una unidad" /></SelectTrigger>
                  <SelectContent>
                    {data?.units.map((u) => <SelectItem key={u.id} value={u.id}>{u.property?.name} · {u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monto</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Fecha</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
              </div>
              <div>
                <Label>Método</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="yape">Yape / Plin</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.unit_id && unitCharges.length > 0 && (
                <div>
                  <Label>Aplicar a cobro (opcional)</Label>
                  <Select value={form.charge_id} onValueChange={(v) => setForm({ ...form, charge_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Dejar por revisar" /></SelectTrigger>
                    <SelectContent>
                      {unitCharges.map((c) => <SelectItem key={c.id} value={c.id}>{monthLabel(c.period_month)} {c.period_year} · {formatMoney(Number(c.amount_expected))}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Referencia, operación..." /></div>
            </div>
            <DialogFooter><Button onClick={createPayment} disabled={!form.unit_id || !form.amount}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-medium"><Inbox className="h-4 w-4 text-warning" /> Por revisar ({review.length})</h2>
        {review.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No hay pagos pendientes de conciliar.</Card>
        ) : (
          <div className="space-y-2">
            {review.map((p) => (
              <Card key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.unit?.property?.name} · {p.unit?.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("es-PE")} · {p.payment_method}{p.notes ? ` · ${p.notes}` : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right font-semibold">{formatMoney(Number(p.amount))}</div>
                  <Button size="sm" variant="outline" onClick={() => confirmPayment(p.id)}><CheckCircle2 className="mr-1 h-4 w-4" />Confirmar</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium">Historial reciente</h2>
        <div className="space-y-2">
          {confirmed.map((p) => (
            <Card key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.unit?.property?.name} · {p.unit?.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("es-PE")} · {p.payment_method}</div>
              </div>
              <div className="text-right font-semibold text-success">{formatMoney(Number(p.amount))}</div>
            </Card>
          ))}
          {confirmed.length === 0 && <div className="text-sm text-muted-foreground">Sin pagos aún.</div>}
        </div>
      </section>
    </div>
  );
}