-- Durable Claude Code / Desktop telemetry for SQL analytics

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS otel_events (
  id                BIGSERIAL PRIMARY KEY,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_time        TIMESTAMPTZ,
  event_name        TEXT,
  severity          TEXT,
  body              TEXT,
  service_name      TEXT,
  service_version   TEXT,
  session_id        TEXT,
  user_id           TEXT,
  user_email        TEXT,
  prompt_id         TEXT,
  message_uuid      TEXT,
  model             TEXT,
  trace_id          TEXT,
  span_id           TEXT,
  prompt_text       TEXT,
  response_text     TEXT,
  prompt_length     INTEGER,
  attributes        JSONB NOT NULL DEFAULT '{}'::jsonb,
  resource_attributes JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_otel_events_time
  ON otel_events (event_time DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_otel_events_name_time
  ON otel_events (event_name, event_time DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_otel_events_session
  ON otel_events (session_id);
CREATE INDEX IF NOT EXISTS idx_otel_events_prompt_id
  ON otel_events (prompt_id);
CREATE INDEX IF NOT EXISTS idx_otel_events_user_email
  ON otel_events (user_email);
CREATE INDEX IF NOT EXISTS idx_otel_events_service
  ON otel_events (service_name);
CREATE INDEX IF NOT EXISTS idx_otel_events_attrs_gin
  ON otel_events USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_otel_events_prompt_trgm
  ON otel_events USING GIN (prompt_text gin_trgm_ops);

CREATE OR REPLACE VIEW v_user_prompts AS
SELECT
  id,
  event_time,
  received_at,
  service_name,
  session_id,
  user_email,
  prompt_id,
  message_uuid,
  prompt_length,
  prompt_text,
  attributes
FROM otel_events
WHERE event_name IN ('user_prompt', 'claude_code.user_prompt')
   OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt');

CREATE OR REPLACE VIEW v_assistant_responses AS
SELECT
  id,
  event_time,
  received_at,
  service_name,
  session_id,
  user_email,
  prompt_id,
  message_uuid,
  model,
  response_text,
  attributes
FROM otel_events
WHERE event_name IN ('assistant_response', 'claude_code.assistant_response')
   OR attributes->>'event.name' IN ('assistant_response', 'claude_code.assistant_response');

CREATE OR REPLACE VIEW v_tool_activity AS
SELECT
  id,
  event_time,
  session_id,
  prompt_id,
  event_name,
  attributes->>'tool_name' AS tool_name,
  attributes->>'decision' AS decision,
  attributes->>'tool_parameters' AS tool_parameters,
  attributes->>'tool_input' AS tool_input,
  attributes
FROM otel_events
WHERE event_name LIKE '%tool%'
   OR attributes->>'event.name' LIKE '%tool%';

CREATE OR REPLACE VIEW v_daily_usage AS
SELECT
  date_trunc('day', COALESCE(event_time, received_at))::date AS day,
  service_name,
  user_email,
  COUNT(*) FILTER (
    WHERE event_name IN ('user_prompt', 'claude_code.user_prompt')
       OR attributes->>'event.name' IN ('user_prompt', 'claude_code.user_prompt')
  ) AS prompt_count,
  COUNT(DISTINCT session_id) AS sessions,
  COUNT(*) AS event_count
FROM otel_events
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

COMMENT ON TABLE otel_events IS
  'Claude Code/Desktop OTLP log events including prompts when OTEL_LOG_USER_PROMPTS=1';
