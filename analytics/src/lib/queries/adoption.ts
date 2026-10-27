import { query } from "../db";
import type { DateRange } from "../range";

export type AdoptionData = {
  daily: Array<{
    day: string;
    prompts: number;
    sessions: number;
    users: number;
    events: number;
  }>;
  leaderboard: Array<{
    user_email: string;
    prompts: number;
    sessions: number;
    events: number;
  }>;
  byService: Array<{
    service_name: string;
    prompts: number;
    sessions: number;
    users: number;
  }>;
  activeUsersByDay: Array<{ day: string; users: number }>;
};

export async function getAdoption(range: DateRange): Promise<AdoptionData> {
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  const [dailyRows, leaderboard, byService, activeUsersByDay] = await Promise.all([
    query<{
      day: string;
      prompts: string;
      sessions: string;
      users: string;
      events: string;
    }>(
      `SELECT
         date_trunc('day', COALESCE(event_time, received_at))::date::text AS day,
         COUNT(*) FILTER (
           WHERE event_name IN ('user_prompt', 'claude_code.user_prompt')
              OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt')
         )::text AS prompts,
         COUNT(DISTINCT session_id)::text AS sessions,
         COUNT(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL)::text AS users,
         COUNT(*)::text AS events
       FROM otel_events
       WHERE COALESCE(event_time, received_at) >= $1::timestamptz
         AND COALESCE(event_time, received_at) <= $2::timestamptz
       GROUP BY 1
       ORDER BY 1 ASC`,
      [fromIso, toIso],
    ),
    query<{
      user_email: string;
      prompts: string;
      sessions: string;
      events: string;
    }>(
      `SELECT
         COALESCE(user_email, '(unknown)') AS user_email,
         COUNT(*) FILTER (
           WHERE event_name IN ('user_prompt', 'claude_code.user_prompt')
              OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt')
         )::text AS prompts,
         COUNT(DISTINCT session_id)::text AS sessions,
         COUNT(*)::text AS events
       FROM otel_events
       WHERE COALESCE(event_time, received_at) >= $1::timestamptz
         AND COALESCE(event_time, received_at) <= $2::timestamptz
       GROUP BY 1
       ORDER BY COUNT(*) DESC
       LIMIT 25`,
      [fromIso, toIso],
    ),
    query<{
      service_name: string;
      prompts: string;
      sessions: string;
      users: string;
    }>(
      `SELECT
         COALESCE(service_name, '(unknown)') AS service_name,
         COUNT(*) FILTER (
           WHERE event_name IN ('user_prompt', 'claude_code.user_prompt')
              OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt')
         )::text AS prompts,
         COUNT(DISTINCT session_id)::text AS sessions,
         COUNT(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL)::text AS users
       FROM otel_events
       WHERE COALESCE(event_time, received_at) >= $1::timestamptz
         AND COALESCE(event_time, received_at) <= $2::timestamptz
       GROUP BY 1
       ORDER BY COUNT(*) DESC`,
      [fromIso, toIso],
    ),
    query<{ day: string; users: string }>(
      `SELECT
         date_trunc('day', COALESCE(event_time, received_at))::date::text AS day,
         COUNT(DISTINCT user_email) FILTER (WHERE user_email IS NOT NULL)::text AS users
       FROM otel_events
       WHERE COALESCE(event_time, received_at) >= $1::timestamptz
         AND COALESCE(event_time, received_at) <= $2::timestamptz
       GROUP BY 1
       ORDER BY 1 ASC`,
      [fromIso, toIso],
    ),
  ]);

  return {
    daily: dailyRows.map((r) => ({
      day: r.day,
      prompts: Number(r.prompts),
      sessions: Number(r.sessions),
      users: Number(r.users),
      events: Number(r.events),
    })),
    leaderboard: leaderboard.map((r) => ({
      user_email: r.user_email,
      prompts: Number(r.prompts),
      sessions: Number(r.sessions),
      events: Number(r.events),
    })),
    byService: byService.map((r) => ({
      service_name: r.service_name,
      prompts: Number(r.prompts),
      sessions: Number(r.sessions),
      users: Number(r.users),
    })),
    activeUsersByDay: activeUsersByDay.map((r) => ({
      day: r.day,
      users: Number(r.users),
    })),
  };
}
