import { getPrometheusUrl } from "./config";

export type PromSample = { labels: Record<string, string>; value: number };
export type PromSeriesPoint = { t: number; v: number };
export type PromSeries = { labels: Record<string, string>; points: PromSeriesPoint[] };

type PromVectorResult = {
  status: string;
  data?: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value?: [number, string];
      values?: Array<[number, string]>;
    }>;
  };
  error?: string;
};

/** Metric base names Claude emits; collector may prefix with claude_code_ */
const METRIC_ALIASES: Record<string, string[]> = {
  cost: [
    "claude_code_claude_code_cost_usage_USD_total",
    "claude_code_cost_usage_USD_total",
  ],
  tokens: [
    "claude_code_claude_code_token_usage_tokens_total",
    "claude_code_token_usage_tokens_total",
  ],
  sessions: [
    "claude_code_claude_code_session_count",
    "claude_code_session_count",
  ],
  commits: [
    "claude_code_claude_code_commit_count",
    "claude_code_commit_count",
  ],
  pull_requests: [
    "claude_code_claude_code_pull_request_count",
    "claude_code_pull_request_count",
  ],
  lines_of_code: [
    "claude_code_claude_code_lines_of_code_count",
    "claude_code_lines_of_code_count",
  ],
  code_edit: [
    "claude_code_claude_code_code_edit_tool_decision_total",
    "claude_code_code_edit_tool_decision_total",
  ],
};

export function metricNames(key: keyof typeof METRIC_ALIASES): string[] {
  return METRIC_ALIASES[key];
}

/** Build OR of metric selectors so either naming form works */
export function orMetrics(names: string[], selector = ""): string {
  return names.map((n) => `${n}${selector}`).join(" or ");
}

async function promFetch(path: string, params: Record<string, string>) {
  const base = getPrometheusUrl().replace(/\/$/, "");
  const url = new URL(`${base}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Prometheus ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as PromVectorResult;
}

export async function queryInstant(expr: string): Promise<PromSample[]> {
  try {
    const json = await promFetch("/api/v1/query", { query: expr });
    if (json.status !== "success" || !json.data) return [];
    return json.data.result.map((r) => ({
      labels: r.metric,
      value: Number(r.value?.[1] ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function queryRange(
  expr: string,
  start: Date,
  end: Date,
  step: string,
): Promise<PromSeries[]> {
  try {
    const json = await promFetch("/api/v1/query_range", {
      query: expr,
      start: String(start.getTime() / 1000),
      end: String(end.getTime() / 1000),
      step,
    });
    if (json.status !== "success" || !json.data) return [];
    return json.data.result.map((r) => ({
      labels: r.metric,
      points: (r.values ?? []).map(([t, v]) => ({ t: t * 1000, v: Number(v) })),
    }));
  } catch {
    return [];
  }
}

export async function sumInstant(expr: string): Promise<number> {
  const samples = await queryInstant(expr);
  return samples.reduce((acc, s) => acc + (Number.isFinite(s.value) ? s.value : 0), 0);
}

export async function checkPrometheus(): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = getPrometheusUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/-/ready`, { cache: "no-store" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** increase() over range with dual metric names */
export function increaseExpr(names: string[], range: string, by?: string): string {
  const inner = orMetrics(names);
  const base = `sum(increase((${inner})[${range}:]))`;
  if (!by) return base;
  return `sum by (${by}) (increase((${inner})[${range}:]))`;
}

export function rateRangeExpr(names: string[], window = "1h"): string {
  const inner = orMetrics(names);
  return `sum(rate((${inner})[${window}:]))`;
}
