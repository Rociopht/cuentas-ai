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
import { formatMoney, monthLabel, CHARGE_STATUS_COLOR, CHARGE_STATUS_LABEL } from "@/lib/format";
import { formatDate } from "@/lib/date";
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
  const [unit, setUnit] = useState({ name: "", due_day: "5", unit_type: "apartment" });

  const { data } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const [prop, units, charges, expenses, contracts] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase.from("units").select("*").eq("property_id", id).order("name"),
        supabase.from("charges").select("id, unit_id, period_year, period_month, amount_expected, status, due_date, unit:units!inner(name, property_id)").eq("unit.property_id", id).order("due_date", { ascending: false }).limit(24),
        supabase.from("expenses").select("*").eq("property_id", id).order("expense_date", { ascending: false }).limit(24),
        supabase.from("contracts").select("id, unit_id, tenant_id, rent_amount, status, start_date, end_date, unit:units!inner(name, property_id), tenant:tenants(full_name)").eq("unit.property_id", id).order("start_date", { ascending: false }),
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
      property_id: id,
      owner_id: userData.user.id,
      name: unit.name,
      due_day: Number(unit.due_day) || 5,
      unit_type: unit.unit_type,
      status: "vacant",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Unidad creada");
    setUnitOpen(false); setUnit({ name: "", due_day: "5", unit_type: "apartment" });
    qc.invalidateQueries({ queryKey: ["property", id] });
  }

  if (!data?.property) return <div className="text-muted-foreground">Cargando…</div>;
  const p = data.property;
  const activeByUnit = new Map<string, { rent_amount: number; tenant: { full_name: string } | null }>();
  for (const c of data.contracts) if (c.status === "active") activeByUnit.set(c.unit_id, { rent_amount: Number(c.rent_amount), tenant: c.tenant as { full_name: string } | null });

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
                  <div><Label>Día de vencimiento mensual</Label><Input type="number" min={1} max={28} value={unit.due_day} onChange={(e) => setUnit({ ...unit, due_day: e.target.value })} /></div>
                </div>
                <DialogFooter><Button onClick={createUnit} disabled={!unit.name}>Crear</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.units.map((u) => {
              const active = activeByUnit.get(u.id);
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><HomeIcon className="h-4 w-4 text-muted-foreground" /><span className="truncate font-medium">{u.name}</span></div>
                      <div className="mt-1 text-xs capitalize text-muted-foreground">{u.unit_type} · vence día {u.due_day}</div>
                    </div>
                    <Badge variant={u.status === "occupied" ? "default" : "secondary"}>{u.status === "occupied" ? "Ocupada" : "Vacante"}</Badge>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Renta</div>
                      <div className="text-lg font-semibold">{active ? formatMoney(active.rent_amount) : "—"}</div>
                    </div>
                    {active?.tenant && (
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="flex items-center justify-end gap-1"><User className="h-3.5 w-3.5" /> Inquilino</div>
                        <div className="mt-0.5 text-foreground">{active.tenant.full_name}</div>
                      </div>
                    )}
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
                <div className="font-medium">{(c.unit as { name: string }).name} · {monthLabel(c.period_month)} {c.period_year}</div>
                <div className="text-xs text-muted-foreground">Vence {formatDate(c.due_date)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatMoney(Number(c.amount_expected))}</div>
                <Badge className={CHARGE_STATUS_COLOR[c.status] ?? ""}>{CHARGE_STATUS_LABEL[c.status] ?? c.status}</Badge>
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
                <div className="text-xs capitalize text-muted-foreground">{e.category} · {formatDate(e.expense_date)}</div>
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
                <div className="text-xs text-muted-foreground">{(c.unit as { name: string }).name} · {formatDate(c.start_date)}{c.end_date ? ` → ${formatDate(c.end_date)}` : ""}</div>
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