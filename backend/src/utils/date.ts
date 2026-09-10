/**
 * Date utilities for the backend.
 * All dates stored as ISO strings (YYYY-MM-DD for dates, full ISO for datetimes).
 * Timezone: India Standard Time (IST = UTC+5:30) — all business dates are IST.
 */

export function todayIST(): string {
  // Use Intl.DateTimeFormat so the correct IST date is returned
  // regardless of whether the server's OS timezone is already IST or UTC.
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  const d = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${d}`;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseISODate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}

export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISODate(d);
}

export function addWeeks(dateStr: string, weeks: number): string {
  const d = parseISODate(dateStr);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return toISODate(d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISODate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/**
 * Generate a sequence of due dates based on frequency and count.
 */
export function generateDueDates(
  firstDueDate: string,
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  count: number,
): string[] {
  const dates: string[] = [];
  let current = firstDueDate;
  for (let i = 0; i < count; i++) {
    dates.push(current);
    if (frequency === 'DAILY') current = addDays(current, 1);
    else if (frequency === 'WEEKLY') current = addWeeks(current, 1);
    else current = addMonths(current, 1);
  }
  return dates;
}

export function isOverdue(dueDate: string, today: string): boolean {
  return dueDate < today;
}
