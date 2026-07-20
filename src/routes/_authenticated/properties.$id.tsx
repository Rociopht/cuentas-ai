import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatMoney, monthLabel, CHARGE_STATUS_COLOR } from "@/lib/format";
import { ArrowLeft, Plus, Home as HomeIcon, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/properties/$id")({
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [unitOpen, setUnitOpen] = useState(false);
  const [unit, setUnit] = useState({ name: "", monthly_rent: "", bedrooms: "", bathrooms: "" });

  const { data } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const [prop, units, charges, expenses, contracts] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase.from("units").select("*, contracts!left(id, status, tenant:tenants(full_name))").eq("property_id", id).order("name"),
        supabase.from("charges").select("*, unit:units!inner(name, property_id)").eq("unit.property_id", id).order("due_date", { ascending: false }).limit(24),
        supabase.from("expenses").select("*").eq("property_id", id).order("expense_date", { ascending: false }).limit(24),
        supabase.from("contracts").select("*, unit:units!inner(name, property_id), tenant:tenants(full_name)").eq("unit.property_id", id).order("start_date", { ascending: false }),
      ]);
      return {
        property: prop.data,
        units: units.data ?? [],
        charges: charges.data ?? [],
        expenses: expenses.data ?? [],
        contracts: contracts.data ?? [],
      };
    },
  });

  async function createUnit() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("units").insert({
      property_id: id, owner_id: userData.user.id, name: unit.name,
      monthly_rent: Number(unit.monthly_rent) || 0,
      bedrooms: unit.bedrooms ? Number(unit.bedrooms) : null,
      bathrooms: unit.bathrooms ? Number(unit.bathrooms) : null,
      status: "vacant",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Unidad creada");
    setUnitOpen(false); setUnit({ name: "", monthly_rent: "", bedrooms: "", bathrooms: "" });
    qc.invalidateQueries({ queryKey: ["property", id] });
  }

  if (!data?.property) return <div className="text-muted-foreground">Cargando…</div>;
  const p = data.property;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/properties" })}><ArrowLeft className="mr-1 h-4 w-4" />Propiedades</Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{p.name}</h1>
        <p className="text-muted-foreground">{p.address}{p.city ? ` · ${p.city}` : ""}</p>
      </div>

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="charges">Cobros</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-3">
          <div className="flex justify-end">
            <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Nueva unidad</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva unidad</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nombre (ej: Depto 301)</Label><Input value={unit.name} onChange={(e) => setUnit({ ...unit, name: e.target.value })} /></div>
                  <div><Label>Renta mensual</Label><Input type="number" value={unit.monthly_rent} onChange={(e) => setUnit({ ...unit, monthly_rent: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Dormitorios</Label><Input type="number" value={unit.bedrooms} onChange={(e) => setUnit({ ...unit, bedrooms: e.target.value })} /></div>
                    <div><Label>Baños</Label><Input type="number" value={unit.bathrooms} onChange={(e) => setUnit({ ...unit, bathrooms: e.target.value })} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={createUnit} disabled={!unit.name}>Crear</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.units.map((u) => {
              const active = (u.contracts as Array<{ status: string; tenant: { full_name: string } | null }> | null)?.find((c) => c.status === "active");
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><HomeIcon className="h-4 w-4 text-muted-foreground" /><span className="truncate font-medium">{u.name}</span></div>
                      <div className="mt-1 text-xs text-muted-foreground">{u.bedrooms ?? "—"} dorm · {u.bathrooms ?? "—"} baños</div>
                    </div>
                    <Badge variant={u.status === "occupied" ? "default" : u.status === "vacant" ? "secondary" : "outline"}>{u.status === "occupied" ? "Ocupada" : u.status === "vacant" ? "Vacante" : u.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Renta</div>
                      <div className="text-lg font-semibold">{formatMoney(Number(u.monthly_rent))}</div>
                    </div>
                    {active?.tenant && <div className="text-right text-xs"><User className="ml-auto h-3.5 w-3.5" /><div className="mt-0.5">{active.tenant.full_name}</div></div>}
                  </div>
                </Card>
              );
            })}
            {data.units.length === 0 && <Card className="col-span-full p-8 text-center text-muted-foreground">Sin unidades. Agrega una para empezar.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="charges" className="space-y-2">
          {data.charges.map((c) => (
            <Card key={c.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{(c.unit as { name: string }).name} · {monthLabel(c.period_year, c.period_month)}</div>
                <div className="text-xs text-muted-foreground">Vence {new Date(c.due_date).toLocaleDateString("es-PE")}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatMoney(Number(c.amount_expected))}</div>
                <Badge className={CHARGE_STATUS_COLOR[c.status]}>{c.status}</Badge>
              </div>
            </Card>
          ))}
          {data.charges.length === 0 && <div className="text-muted-foreground">Aún no hay cobros generados.</div>}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-2">
          {data.expenses.map((e) => (
            <Card key={e.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{e.description ?? e.category}</div>
                <div className="text-xs text-muted-foreground capitalize">{e.category} · {new Date(e.expense_date).toLocaleDateString("es-PE")}</div>
              </div>
              <div className="font-semibold text-destructive">{formatMoney(Number(e.amount))}</div>
            </Card>
          ))}
          {data.expenses.length === 0 && <div className="text-muted-foreground">Sin gastos registrados.</div>}
          <Button asChild variant="outline" className="w-full"><Link to="/expenses">Registrar nuevo gasto</Link></Button>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-2">
          {data.contracts.map((c) => (
            <Card key={c.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{(c.tenant as { full_name: string } | null)?.full_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{(c.unit as { name: string }).name} · {new Date(c.start_date).toLocaleDateString("es-PE")} → {new Date(c.end_date).toLocaleDateString("es-PE")}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatMoney(Number(c.rent_amount))}/mes</div>
                <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
              </div>
            </Card>
          ))}
          {data.contracts.length === 0 && <div className="text-muted-foreground">Sin contratos.</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}