export function formatUsd(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatMultiple(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n === Infinity) return "∞";
  return `${n.toFixed(1)}×`;
}

export function formatHours(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${formatNumber(n, 1)} h`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "No data yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
