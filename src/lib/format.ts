export function formatMoney(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : v ?? 0;
  if (!Number.isFinite(n as number)) return "S/ 0";
  return "S/ " + (n as number).toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function monthLabel(m: number): string {
  return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m-1] ?? "";
}

export function daysBetween(a: string | Date, b: string | Date = new Date()): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.floor((db - da) / 86400000);
}

export const CHARGE_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Pagado",
  overdue: "Vencido",
};

export const CHARGE_STATUS_COLOR: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  partial: "bg-warning/15 text-warning-foreground border border-warning/30",
  paid: "bg-success/15 text-success border border-success/30",
  overdue: "bg-destructive/10 text-destructive border border-destructive/30",
};