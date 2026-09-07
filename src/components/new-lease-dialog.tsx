import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { daysInMonth, todayISO } from "@/lib/date";

type UnitOption = { id: string; name: string };

function plusOneYear(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${(y ?? 1970) + 1}-${String(m ?? 1).padStart(2, "0")}-${String(d ?? 1).padStart(2, "0")}`;
}

export function NewLeaseDialog({
  units,
  defaultUnitId,
  label = "Nuevo alquiler",
  size = "sm",
  variant = "default",
}: {
  units: UnitOption[];
  defaultUnitId?: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline";
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = todayISO();
  const [f, setF] = useState({
    unit_id: defaultUnitId ?? "",
    full_name: "",
    phone: "+51 ",
    email: "",
    rent_amount: "",
    currency: "PEN",
    due_day: "5",
    start_date: today,
    end_date: plusOneYear(today),
  });

  const amount = Number(f.rent_amount);
  const dueDay = Math.min(Math.max(Number(f.due_day) || 1, 1), 31);
  const valid = Boolean(f.unit_id) && f.full_name.trim().length > 2 && amount > 0 && Boolean(f.start_date);

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) { toast.error("Tu sesión expiró, vuelve a entrar."); return; }

      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .insert({ owner_id, full_name: f.full_name.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null })
        .select("id")
        .single();
      if (tErr || !tenant) { toast.error(tErr?.message ?? "No se pudo guardar el inquilino"); return; }

      const { data: contract, error: cErr } = await supabase
        .from("contracts")
        .insert({
          owner_id,
          unit_id: f.unit_id,
          tenant_id: tenant.id,
          rent_amount: amount,
          currency: f.currency,
          start_date: f.start_date,
          end_date: f.end_date || null,
          status: "active",
        })
        .select("id")
        .single();
      if (cErr || !contract) { toast.error(cErr?.message ?? "No se pudo guardar el contrato"); return; }

      await supabase.from("units").update({ status: "occupied", due_day: dueDay }).eq("id", f.unit_id);

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = Math.min(dueDay, daysInMonth(year, month));
      const { error: chErr } = await supabase.from("charges").insert({
        owner_id,
        unit_id: f.unit_id,
        contract_id: contract.id,
        tenant_id: tenant.id,
        concept: "Alquiler",
        period_month: month,
        period_year: year,
        amount_expected: amount,
        due_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        status: "pending",
      });
      if (chErr) toast.error("Contrato creado, pero el cobro del mes no se generó.");
      else toast.success("Alquiler registrado y cobro del mes generado");

      setOpen(false);
      setF({ ...f, full_name: "", phone: "+51 ", email: "", rent_amount: "" });
      await qc.invalidateQueries();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}><UserPlus className="mr-1.5 h-4 w-4" />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo alquiler</DialogTitle>
          <DialogDescription>Registra al inquilino, el acuerdo y el primer cobro del mes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Unidad</Label>
            <Select value={f.unit_id} onValueChange={(v) => setF({ ...f, unit_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona la unidad" /></SelectTrigger>
              <SelectContent>
                {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nombre completo del inquilino</Label>
            <Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Ana Torres" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>WhatsApp</Label>
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+51 987654321" />
            </div>
            <div>
              <Label>Email (opcional)</Label>
              <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="ana@correo.com" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Renta mensual</Label>
              <Input type="number" step="0.01" min="0" value={f.rent_amount} onChange={(e) => setF({ ...f, rent_amount: e.target.value })} placeholder="2500" />
            </div>
            <div>
              <Label>Moneda</Label>
              <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PEN">Soles (S/)</SelectItem>
                  <SelectItem value="USD">Dólares ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Día de cobro</Label>
              <Input type="number" min={1} max={31} value={f.due_day} onChange={(e) => setF({ ...f, due_day: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Inicio del contrato</Label>
              <Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Fin del contrato</Label>
              <Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={!valid || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar alquiler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
