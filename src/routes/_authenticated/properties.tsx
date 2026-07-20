import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import { Building2, Plus, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/properties")({
  component: Properties,
});

function Properties() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "Lima", property_type: "multi_unit" });

  const { data, isLoading } = useQuery({
    queryKey: ["properties-full"],
    queryFn: async () => {
      const [propsRes, unitsRes, chargesRes, allocsRes, expRes] = await Promise.all([
        supabase.from("properties").select("*").order("created_at"),
        supabase.from("units").select("id, property_id, status"),
        supabase.from("charges").select("id, unit_id, amount_expected"),
        supabase.from("payment_allocations").select("amount_allocated, charge_id"),
        supabase.from("expenses").select("amount, property_id"),
      ]);
      const charges = chargesRes.data ?? [];
      const allocs = allocsRes.data ?? [];
      const chargeById = new Map(charges.map((c) => [c.id, c]));
      const units = unitsRes.data ?? [];
      const unitToProp = new Map(units.map((u) => [u.id, u.property_id]));
      return (propsRes.data ?? []).map((p) => {
        const pUnits = units.filter((u) => u.property_id === p.id);
        const occupied = pUnits.filter((u) => u.status === "occupied").length;
        const expected = charges.filter((c) => unitToProp.get(c.unit_id) === p.id).reduce((s, c) => s + Number(c.amount_expected), 0);
        const collected = allocs.reduce((s, a) => {
          const c = chargeById.get(a.charge_id);
          if (c && unitToProp.get(c.unit_id) === p.id) return s + Number(a.amount_allocated);
          return s;
        }, 0);
        const spent = (expRes.data ?? []).filter((e) => e.property_id === p.id).reduce((s, e) => s + Number(e.amount), 0);
        return { ...p, units: pUnits.length, occupied, expected, collected, pending: Math.max(expected - collected, 0), spent, result: collected - spent };
      });
    },
  });

  async function create() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("properties").insert({ ...form, owner_id: userData.user.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Propiedad creada");
    setOpen(false); setForm({ name: "", address: "", city: "Lima", property_type: "multi_unit" });
    qc.invalidateQueries({ queryKey: ["properties-full"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propiedades</h1>
          <p className="text-muted-foreground">Gestiona tus inmuebles y unidades.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Agregar propiedad</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva propiedad</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Rentas Miraflores" /></div>
              <div><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Ciudad</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create} disabled={!form.name}>Crear</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading && <div className="text-muted-foreground">Cargando…</div>}
      {data && data.length === 0 && (
        <Card className="p-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">No tienes propiedades todavía.</p>
          <Button className="mt-4" onClick={() => setOpen(true)}>Agregar mi primera propiedad</Button>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <Link key={p.id} to="/properties/$id" params={{ id: p.id }}>
            <Card className="h-full p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{p.address}</div>
              <h3 className="mt-1 truncate text-lg font-semibold">{p.name}</h3>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{p.units} unidades</span>
                <span>·</span>
                <span>{p.occupied} ocupadas</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Cobrado</div><div className="font-semibold text-success">{formatMoney(p.collected)}</div></div>
                <div><div className="text-xs text-muted-foreground">Pendiente</div><div className="font-semibold text-warning">{formatMoney(p.pending)}</div></div>
                <div className="col-span-2 border-t pt-2"><div className="text-xs text-muted-foreground">Resultado de caja</div><div className="text-lg font-semibold">{formatMoney(p.result)}</div></div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}