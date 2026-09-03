/** Indian formatting helpers. All money values are stored as plain numbers (INR). */

export function inr(value: number | null | undefined): string {
  const n = safe(value);
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
}

/** Compact Indian notation: ₹18.50L / ₹1.25Cr / ₹85,000 */
export function inrShort(value: number | null | undefined): string {
  const n = safe(value);
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  return inr(n);
}

export function num(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN").format(safe(value));
}

export function safe(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return value;
}

export function pct(value: number | null | undefined): string {
  return `${Math.round(safe(value))}%`;
}

/** ISO (yyyy-mm-dd) -> 03 Sep 2026 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return toISO(d);
}

export function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + "T00:00:00").getTime();
  const d2 = new Date(b + "T00:00:00").getTime();
  return Math.round((d2 - d1) / 86_400_000);
}

export function padId(prefix: string, n: number, width = 6): string {
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
