import { query, queryOne } from "../db";
import { increaseExpr, metricNames, queryInstant, sumInstant } from "../prometheus";
import type { DateRange } from "../range";

export type ProductivityData = {
  prompts: number;
  sessions: number;
  promptsPerSession: number | null;
  toolMix: Array<{ tool_name: string; count: number }>;
  toolDecisions: Array<{ decision: string; count: number }>;
  commits: number;
  pullRequests: number;
  linesAdded: number;
  linesRemoved: number;
  codeEditDecisions: Array<{ decision: string; value: number }>;
};

export async function getProductivity(
  range: DateRange,
): Promise<ProductivityData> {
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  const [pgStats, toolMix, toolDecisions, commits, prs, locByType, codeEdit] =
    await Promise.all([
      queryOne<{ prompts: string; sessions: string }>(
        `SELECT
           COUNT(*) FILTER (
             WHERE event_name IN ('user_prompt', 'claude_code.user_prompt')
                OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt')
           )::text AS prompts,
           COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::text AS sessions
         FROM otel_events
         WHERE COALESCE(event_time, received_at) >= $1::timestamptz
           AND COALESCE(event_time, received_at) <= $2::timestamptz`,
        [fromIso, toIso],
      ),
      query<{ tool_name: string; count: string }>(
        `SELECT
           COALESCE(attributes->>'tool_name', '(unknown)') AS tool_name,
           COUNT(*)::text AS count
         FROM otel_events
         WHERE COALESCE(event_time, received_at) >= $1::timestamptz
           AND COALESCE(event_time, received_at) <= $2::timestamptz
           AND (
             event_name LIKE '%tool%'
             OR attributes->>'event.name' LIKE '%tool%'
           )
         GROUP BY 1
         ORDER BY COUNT(*) DESC
         LIMIT 15`,
        [fromIso, toIso],
      ),
      query<{ decision: string; count: string }>(
        `SELECT
           COALESCE(attributes->>'decision', '(none)') AS decision,
           COUNT(*)::text AS count
         FROM otel_events
         WHERE COALESCE(event_time, received_at) >= $1::timestamptz
           AND COALESCE(event_time, received_at) <= $2::timestamptz
           AND (
             event_name LIKE '%tool%'
             OR attributes->>'event.name' LIKE '%tool%'
           )
           AND attributes ? 'decision'
         GROUP BY 1
         ORDER BY COUNT(*) DESC`,
        [fromIso, toIso],
      ),
      sumInstant(increaseExpr(metricNames("commits"), range.promRange)),
      sumInstant(increaseExpr(metricNames("pull_requests"), range.promRange)),
      queryInstant(
        increaseExpr(metricNames("lines_of_code"), range.promRange, "type"),
      ),
      queryInstant(
        increaseExpr(metricNames("code_edit"), range.promRange, "decision"),
      ),
    ]);

  const prompts = Number(pgStats?.prompts ?? 0);
  const sessions = Number(pgStats?.sessions ?? 0);
  const linesAdded =
    locByType.find((s) => (s.labels.type || "").includes("add"))?.value ??
    locByType.find((s) => s.labels.type === "added")?.value ??
    0;
  const linesRemoved =
    locByType.find((s) => (s.labels.type || "").includes("remov"))?.value ??
    locByType.find((s) => s.labels.type === "removed")?.value ??
    0;

  return {
    prompts,
    sessions,
    promptsPerSession: sessions > 0 ? prompts / sessions : null,
    toolMix: toolMix.map((r) => ({
      tool_name: r.tool_name,
      count: Number(r.count),
    })),
    toolDecisions: toolDecisions.map((r) => ({
      decision: r.decision,
      count: Number(r.count),
    })),
    commits: Math.round(commits),
    pullRequests: Math.round(prs),
    linesAdded: Math.round(linesAdded),
    linesRemoved: Math.round(linesRemoved),
    codeEditDecisions: codeEdit.map((s) => ({
      decision: s.labels.decision || "unknown",
      value: s.value,
    })),
  };
}
