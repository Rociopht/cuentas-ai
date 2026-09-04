/**
 * Fuente única de verdad para fechas "solo fecha" (columnas `date` de Postgres).
 *
 * Regla del proyecto:
 * - Las columnas `date` (due_date, expense_date, start_date, end_date) NO tienen
 *   zona horaria: son un día calendario. `new Date("2026-07-30")` las interpreta
 *   como medianoche UTC y al renderizar en Lima (GMT-5) muestra 29/07 → bug de -1 día.
 * - Por eso TODO parseo pasa por `parseDateOnly` (medianoche local) y todo render
 *   por `formatDate`. Los rangos de mes se construyen con aritmética de strings
 *   (`monthBounds`), nunca con `toISOString()` sobre una fecha local.
 */

export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return parseDateOnly(value).toLocaleDateString("es-PE");
}

export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return parseDateOnly(value).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
}

/** Día del mes (1-31) de una fecha "solo fecha", sin corrimiento por timezone. */
export function dayOfMonth(value: string): number {
  return parseDateOnly(value).getDate();
}

/** Fecha de hoy como `YYYY-MM-DD` en la zona del usuario (no UTC). */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Límites del mes como strings `YYYY-MM-DD`, sin pasar por UTC. */
export function monthBounds(year: number, month: number): { start: string; end: string } {
  const mm = String(month).padStart(2, "0");
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(daysInMonth(year, month)).padStart(2, "0")}` };
}

/** ¿La fecha `value` cae en el mes indicado? Comparación por día calendario. */
export function isInMonth(value: string, year: number, month: number): boolean {
  const d = parseDateOnly(value);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

/** Días entre hoy y una fecha "solo fecha". Negativo = ya pasó (atraso). */
export function daysFromToday(value: string): number {
  return Math.round((parseDateOnly(value).getTime() - startOfToday().getTime()) / 86400000);
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
