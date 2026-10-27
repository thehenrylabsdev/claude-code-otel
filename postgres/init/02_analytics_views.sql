-- Optional analytics helpers for the executive Next.js app.
-- Applied automatically on fresh Postgres volumes only.

CREATE OR REPLACE VIEW v_user_leaderboard AS
SELECT
  COALESCE(user_email, '(unknown)') AS user_email,
  COUNT(*) FILTER (
    WHERE event_name IN ('user_prompt', 'claude_code.user_prompt')
       OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt')
  ) AS prompt_count,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(*) AS event_count,
  MIN(COALESCE(event_time, received_at)) AS first_seen,
  MAX(COALESCE(event_time, received_at)) AS last_seen
FROM otel_events
GROUP BY 1;
