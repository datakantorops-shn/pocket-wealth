export function formatIDR(value: number, opts?: { compact?: boolean }) {
  if (opts?.compact) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
    if (abs >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`;
    if (abs >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function monthKey(d: Date = new Date()) {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

export function monthLabel(d: Date) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(d);
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function percentChange(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
