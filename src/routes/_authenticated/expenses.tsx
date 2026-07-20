import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  { v: "maintenance", l: "Mantenimiento" },
  { v: "utilities", l: "Servicios" },
  { v: "taxes", l: "Impuestos" },
  { v: "hoa", l: "Mantenimiento HOA" },
  { v: "repairs", l: "Reparaciones" },
  { v: "insurance", l: "Seguros" },
  { v: "management", l: "Administración" },
  { v: "other", l: "Otros" },
];

export const Route = createFileRoute("/_authenticated/expenses")({
  component: Expenses,
});

function Expenses() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ property_id: "", unit_id: "", category: "maintenance", amount: "", description: "", expense_date: new Date().toISOString().slice(0, 10) });

  const { data } = useQuery({
    queryKey: ["expenses-page"],
    queryFn: async () => {
      const [exp, props, units] = await Promise.all([
        supabase.from("expenses").select("*, property:properties(name), unit:units(name)").order("expense_date", { ascending: false }).limit(120),
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("units").select("id, name, property_id").order("name"),
      ]);
      return { expenses: exp.data ?? [], properties: props.data ?? [], units: units.data ?? [] };
    },
  });

  async function create() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !form.property_id || !form.amount) return;
    const { error } = await supabase.from("expenses").insert({
      owner_id: userData.user.id,
      property_id: form.property_id,
      unit_id: form.unit_id || null,
      category: form.category,
      amount: Number(form.amount),
      description: form.description || null,
      expense_date: form.expense_date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Gasto registrado");
    setOpen(false);
    setForm({ property_id: "", unit_id: "", category: "maintenance", amount: "", description: "", expense_date: new Date().toISOString().slice(0, 10) });
    qc.invalidateQueries();
  }

  const total = (data?.expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const propUnits = data?.units.filter((u) => u.property_id === form.property_id) ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="text-muted-foreground">Todo lo que sale de tu bolsillo, por propiedad o unidad.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Registrar gasto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Propiedad</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v, unit_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {data?.properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {propUnits.length > 0 && (
                <div>
                  <Label>Unidad (opcional)</Label>
                  <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Toda la propiedad" /></SelectTrigger>
                    <SelectContent>
                      {propUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoría</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Monto</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              </div>
              <div><Label>Fecha</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div><Label>Descripción</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle" /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={!form.property_id || !form.amount}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="p-5">
        <div className="text-xs uppercase text-muted-foreground">Total registrado (recientes)</div>
        <div className="mt-1 text-3xl font-semibold text-destructive">{formatMoney(total)}</div>
      </Card>

      <div className="space-y-2">
        {(data?.expenses ?? []).map((e) => (
          <Card key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
            <div className="min-w-0">
              <div className="truncate font-medium">{e.description ?? CATEGORIES.find((c) => c.v === e.category)?.l ?? e.category}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{e.property?.name}{e.unit ? ` · ${e.unit.name}` : ""} · {new Date(e.expense_date).toLocaleDateString("es-PE")}</div>
            </div>
            <div className="text-right font-semibold text-destructive">{formatMoney(Number(e.amount))}</div>
          </Card>
        ))}
        {data && data.expenses.length === 0 && (
          <Card className="p-10 text-center">
            <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">No hay gastos registrados.</p>
          </Card>
        )}
      </div>
    </div>
  );
}