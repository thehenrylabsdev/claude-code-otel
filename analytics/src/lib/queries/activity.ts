import { query } from "../db";
import type { DateRange } from "../range";

export type PromptRow = {
  id: string;
  event_time: string | null;
  service_name: string | null;
  user_email: string | null;
  session_id: string | null;
  prompt_length: number | null;
  prompt_preview: string | null;
};

export type ActivityData = {
  prompts: PromptRow[];
  total: number;
  users: string[];
  services: string[];
};

export async function getActivity(
  range: DateRange,
  opts: {
    q?: string;
    user?: string;
    service?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<ActivityData> {
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const conditions = [
    `COALESCE(event_time, received_at) >= $1::timestamptz`,
    `COALESCE(event_time, received_at) <= $2::timestamptz`,
    `(event_name IN ('user_prompt', 'claude_code.user_prompt')
      OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt'))`,
  ];
  const params: unknown[] = [fromIso, toIso];

  if (opts.user) {
    params.push(opts.user);
    conditions.push(`user_email = $${params.length}`);
  }
  if (opts.service) {
    params.push(opts.service);
    conditions.push(`service_name = $${params.length}`);
  }
  if (opts.q) {
    params.push(`%${opts.q}%`);
    conditions.push(`prompt_text ILIKE $${params.length}`);
  }

  const where = conditions.join(" AND ");

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const [prompts, countRow, users, services] = await Promise.all([
    query<{
      id: string;
      event_time: string | null;
      service_name: string | null;
      user_email: string | null;
      session_id: string | null;
      prompt_length: number | null;
      prompt_preview: string | null;
    }>(
      `SELECT
         id::text,
         event_time::text,
         service_name,
         user_email,
         session_id,
         prompt_length,
         left(prompt_text, 240) AS prompt_preview
       FROM otel_events
       WHERE ${where}
       ORDER BY COALESCE(event_time, received_at) DESC NULLS LAST
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    ),
    query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM otel_events WHERE ${where}`,
      params.slice(0, params.length - 2),
    ),
    query<{ user_email: string }>(
      `SELECT DISTINCT user_email
       FROM otel_events
       WHERE user_email IS NOT NULL
         AND COALESCE(event_time, received_at) >= $1::timestamptz
         AND COALESCE(event_time, received_at) <= $2::timestamptz
       ORDER BY 1
       LIMIT 100`,
      [fromIso, toIso],
    ),
    query<{ service_name: string }>(
      `SELECT DISTINCT service_name
       FROM otel_events
       WHERE service_name IS NOT NULL
         AND COALESCE(event_time, received_at) >= $1::timestamptz
         AND COALESCE(event_time, received_at) <= $2::timestamptz
       ORDER BY 1
       LIMIT 50`,
      [fromIso, toIso],
    ),
  ]);

  return {
    prompts,
    total: Number(countRow[0]?.total ?? 0),
    users: users.map((u) => u.user_email),
    services: services.map((s) => s.service_name),
  };
}
