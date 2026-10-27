import {
  increaseExpr,
  metricNames,
  queryInstant,
  queryRange,
  sumInstant,
} from "../prometheus";
import type { DateRange } from "../range";
import { queryOne } from "../db";

export type CostsData = {
  totalCostUsd: number;
  costOverTime: Array<{ t: number; v: number }>;
  costByModel: Array<{ model: string; value: number }>;
  tokensByType: Array<{ type: string; value: number }>;
  sessions: number;
  activeUsers: number;
  costPerSession: number | null;
  costPerUser: number | null;
  subscriptionCompare: {
    monthlySpend: number;
    proSeats: number;
    max5xSeats: number;
    max20xSeats: number;
    activeUsers: number;
  };
};

export async function getCosts(range: DateRange): Promise<CostsData> {
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  const [
    totalCostUsd,
    costSeries,
    byModel,
    byTokenType,
    sessionsProm,
    pgUsers,
  ] = await Promise.all([
    sumInstant(increaseExpr(metricNames("cost"), range.promRange)),
    queryRange(
      `sum(increase((${metricNames("cost").join(" or ")})[1h:]))`,
      range.from,
      range.to,
      range.step,
    ),
    queryInstant(
      increaseExpr(metricNames("cost"), range.promRange, "model"),
    ),
    queryInstant(
      increaseExpr(metricNames("tokens"), range.promRange, "type"),
    ),
    sumInstant(increaseExpr(metricNames("sessions"), range.promRange)),
    queryOne<{ users: string; sessions: string }>(
      `SELECT
         COUNT(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL)::text AS users,
         COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::text AS sessions
       FROM otel_events
       WHERE COALESCE(event_time, received_at) >= $1::timestamptz
         AND COALESCE(event_time, received_at) <= $2::timestamptz`,
      [fromIso, toIso],
    ),
  ]);

  const sessions = Math.max(
    Math.round(sessionsProm),
    Number(pgUsers?.sessions ?? 0),
  );
  const activeUsers = Number(pgUsers?.users ?? 0);

  // Normalize spend to ~30d for subscription comparison
  const rangeDays = Math.max(
    1,
    (range.to.getTime() - range.from.getTime()) / 86_400_000,
  );
  const monthlySpend = (totalCostUsd / rangeDays) * 30;

  return {
    totalCostUsd,
    costOverTime: costSeries[0]?.points.map((p) => ({ t: p.t, v: p.v })) ?? [],
    costByModel: byModel
      .map((s) => ({
        model: s.labels.model || "unknown",
        value: s.value,
      }))
      .sort((a, b) => b.value - a.value),
    tokensByType: byTokenType
      .map((s) => ({
        type: s.labels.type || "unknown",
        value: s.value,
      }))
      .sort((a, b) => b.value - a.value),
    sessions,
    activeUsers,
    costPerSession: sessions > 0 ? totalCostUsd / sessions : null,
    costPerUser: activeUsers > 0 ? totalCostUsd / activeUsers : null,
    subscriptionCompare: {
      monthlySpend,
      proSeats: activeUsers * 20,
      max5xSeats: activeUsers * 100,
      max20xSeats: activeUsers * 200,
      activeUsers,
    },
  };
}
