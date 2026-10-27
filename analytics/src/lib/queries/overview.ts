import { queryOne } from "../db";
import {
  increaseExpr,
  metricNames,
  queryInstant,
  queryRange,
  sumInstant,
} from "../prometheus";
import { computeRoi } from "../roi";
import type { DateRange } from "../range";

export type OverviewData = {
  costUsd: number;
  sessionsProm: number;
  sessionsPg: number;
  prompts: number;
  activeUsers: number;
  eventCount: number;
  lastReceivedAt: string | null;
  roi: ReturnType<typeof computeRoi>;
  costTrend: Array<{ t: number; v: number }>;
  sessionTrend: Array<{ t: number; v: number }>;
};

export async function getOverview(range: DateRange): Promise<OverviewData> {
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  const [pgStats, lastEvent, costUsd, sessionsProm, costSeries, sessionSeries] =
    await Promise.all([
      queryOne<{
        prompts: string;
        sessions: string;
        users: string;
        events: string;
      }>(
        `SELECT
           COUNT(*) FILTER (
             WHERE event_name IN ('user_prompt', 'claude_code.user_prompt')
                OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt')
           )::text AS prompts,
           COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::text AS sessions,
           COUNT(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL)::text AS users,
           COUNT(*)::text AS events
         FROM otel_events
         WHERE COALESCE(event_time, received_at) >= $1::timestamptz
           AND COALESCE(event_time, received_at) <= $2::timestamptz`,
        [fromIso, toIso],
      ),
      queryOne<{ last_received_at: string | null }>(
        `SELECT MAX(received_at)::text AS last_received_at FROM otel_events`,
      ),
      sumInstant(increaseExpr(metricNames("cost"), range.promRange)),
      sumInstant(increaseExpr(metricNames("sessions"), range.promRange)),
      queryRange(
        `sum(increase((${metricNames("cost").join(" or ")})[1h:]))`,
        range.from,
        range.to,
        range.step,
      ),
      queryRange(
        `sum(increase((${metricNames("sessions").join(" or ")})[1h:]))`,
        range.from,
        range.to,
        range.step,
      ),
    ]);

  const prompts = Number(pgStats?.prompts ?? 0);
  const sessionsPg = Number(pgStats?.sessions ?? 0);
  const activeUsers = Number(pgStats?.users ?? 0);
  const eventCount = Number(pgStats?.events ?? 0);
  const sessions = Math.max(sessionsPg, Math.round(sessionsProm));

  const costTrend =
    costSeries[0]?.points.map((p) => ({ t: p.t, v: p.v })) ?? [];
  const sessionTrend =
    sessionSeries[0]?.points.map((p) => ({ t: p.t, v: p.v })) ?? [];

  // If increase on gauge-like session_count is empty, fall back to current gauge
  let sessionsPromFinal = sessionsProm;
  if (!sessionsPromFinal) {
    const gauge = await queryInstant(
      `sum(${metricNames("sessions").join(" or ")})`,
    );
    sessionsPromFinal = gauge.reduce((a, s) => a + s.value, 0);
  }

  const roi = computeRoi(sessions, costUsd);

  return {
    costUsd,
    sessionsProm: sessionsPromFinal,
    sessionsPg,
    prompts,
    activeUsers,
    eventCount,
    lastReceivedAt: lastEvent?.last_received_at ?? null,
    roi,
    costTrend,
    sessionTrend,
  };
}

export async function getFreshness() {
  const row = await queryOne<{ last_received_at: string | null }>(
    `SELECT MAX(received_at)::text AS last_received_at FROM otel_events`,
  );
  return { lastReceivedAt: row?.last_received_at ?? null };
}
