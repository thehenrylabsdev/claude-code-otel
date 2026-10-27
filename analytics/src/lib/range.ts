import { subDays, differenceInSeconds } from "date-fns";

export type DateRange = {
  from: Date;
  to: Date;
  label: string;
  /** Prometheus range vector duration, e.g. "7d" */
  promRange: string;
  /** Step for range queries */
  step: string;
};

const PRESETS: Record<string, { days: number; step: string }> = {
  "7d": { days: 7, step: "1h" },
  "30d": { days: 30, step: "6h" },
  "90d": { days: 90, step: "1d" },
};

export function parseRange(
  rangeParam?: string | null,
  fromParam?: string | null,
  toParam?: string | null,
): DateRange {
  const now = new Date();

  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from < to) {
      const secs = differenceInSeconds(to, from);
      const days = Math.max(1, Math.ceil(secs / 86400));
      return {
        from,
        to,
        label: "custom",
        promRange: `${days}d`,
        step: days <= 7 ? "1h" : days <= 30 ? "6h" : "1d",
      };
    }
  }

  const key = rangeParam && PRESETS[rangeParam] ? rangeParam : "30d";
  const preset = PRESETS[key];
  return {
    from: subDays(now, preset.days),
    to: now,
    label: key,
    promRange: key,
    step: preset.step,
  };
}

export function rangeToSearchParams(range: DateRange): string {
  if (range.label === "custom") {
    return `from=${range.from.toISOString()}&to=${range.to.toISOString()}`;
  }
  return `range=${range.label}`;
}
