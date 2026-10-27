"""
Minimal OTLP HTTP/JSON logs receiver that persists Claude Code events into PostgreSQL.
Accepts POST /v1/logs (OTLP JSON) from the OpenTelemetry Collector.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

import psycopg
from fastapi import FastAPI, Request, Response
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

DATABASE_URL = os.environ["DATABASE_URL"]

pool = ConnectionPool(conninfo=DATABASE_URL, min_size=1, max_size=8, open=True)
app = FastAPI(title="claude-otel-postgres-sink", version="1.0.0")


def _attr_map(attrs: list[dict[str, Any]] | None) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if not attrs:
        return out
    for item in attrs:
        key = item.get("key")
        if not key:
            continue
        value = item.get("value") or {}
        if "stringValue" in value:
            out[key] = value["stringValue"]
        elif "intValue" in value:
            out[key] = int(value["intValue"])
        elif "doubleValue" in value:
            out[key] = float(value["doubleValue"])
        elif "boolValue" in value:
            out[key] = bool(value["boolValue"])
        elif "arrayValue" in value:
            out[key] = value["arrayValue"]
        elif "kvlistValue" in value:
            out[key] = value["kvlistValue"]
        else:
            out[key] = value
    return out


def _ns_to_dt(ns: Any) -> datetime | None:
    if ns is None or ns == "":
        return None
    try:
        return datetime.fromtimestamp(int(ns) / 1_000_000_000, tz=timezone.utc)
    except (TypeError, ValueError, OSError):
        return None


def _pick(attrs: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in attrs and attrs[key] not in (None, ""):
            return attrs[key]
    return None


def _normalize_event_name(attrs: dict[str, Any], body: str | None) -> str | None:
    name = _pick(attrs, "event.name", "name")
    if name:
        return str(name)
    if body and body.startswith("claude_code."):
        return body
    return body


INSERT_SQL = """
INSERT INTO otel_events (
  event_time, event_name, severity, body,
  service_name, service_version,
  session_id, user_id, user_email,
  prompt_id, message_uuid, model,
  trace_id, span_id,
  prompt_text, response_text, prompt_length,
  attributes, resource_attributes
) VALUES (
  %(event_time)s, %(event_name)s, %(severity)s, %(body)s,
  %(service_name)s, %(service_version)s,
  %(session_id)s, %(user_id)s, %(user_email)s,
  %(prompt_id)s, %(message_uuid)s, %(model)s,
  %(trace_id)s, %(span_id)s,
  %(prompt_text)s, %(response_text)s, %(prompt_length)s,
  %(attributes)s, %(resource_attributes)s
)
"""


def _rows_from_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for resource_log in payload.get("resourceLogs") or payload.get("resource_logs") or []:
        resource = resource_log.get("resource") or {}
        resource_attrs = _attr_map(resource.get("attributes"))
        service_name = resource_attrs.get("service.name")
        service_version = resource_attrs.get("service.version")

        for scope_log in resource_log.get("scopeLogs") or resource_log.get("scope_logs") or []:
            for record in scope_log.get("logRecords") or scope_log.get("log_records") or []:
                attrs = _attr_map(record.get("attributes"))
                body_obj = record.get("body") or {}
                body = body_obj.get("stringValue") if isinstance(body_obj, dict) else str(body_obj)
                event_name = _normalize_event_name(attrs, body)

                prompt_text = _pick(attrs, "prompt", "user_prompt")
                response_text = _pick(attrs, "response")
                prompt_length = _pick(attrs, "prompt_length", "prompt.length")
                if prompt_length is not None:
                    try:
                        prompt_length = int(prompt_length)
                    except (TypeError, ValueError):
                        prompt_length = None

                rows.append(
                    {
                        "event_time": _ns_to_dt(
                            record.get("timeUnixNano")
                            or record.get("time_unix_nano")
                            or record.get("observedTimeUnixNano")
                            or record.get("observed_time_unix_nano")
                        ),
                        "event_name": event_name,
                        "severity": record.get("severityText") or record.get("severity_text"),
                        "body": body,
                        "service_name": service_name,
                        "service_version": service_version,
                        "session_id": _pick(attrs, "session.id", "session_id"),
                        "user_id": _pick(attrs, "user.id", "user_id"),
                        "user_email": _pick(attrs, "user.email", "user_email"),
                        "prompt_id": _pick(attrs, "prompt.id", "prompt_id"),
                        "message_uuid": _pick(attrs, "message.uuid", "message_uuid"),
                        "model": _pick(attrs, "model"),
                        "trace_id": record.get("traceId") or record.get("trace_id"),
                        "span_id": record.get("spanId") or record.get("span_id"),
                        "prompt_text": prompt_text,
                        "response_text": response_text,
                        "prompt_length": prompt_length,
                        "attributes": Jsonb(attrs),
                        "resource_attributes": Jsonb(resource_attrs),
                    }
                )
    return rows


@app.get("/health")
def health() -> dict[str, str]:
    with pool.connection() as conn:
        conn.execute("SELECT 1")
    return {"status": "ok"}


@app.post("/v1/logs")
async def ingest_logs(request: Request) -> Response:
    content_type = (request.headers.get("content-type") or "").lower()
    raw = await request.body()
    if not raw:
        return Response(status_code=204)

    if "json" not in content_type and not raw[:1] in (b"{", b"["):
        # Collector may still send protobuf if encoding is ignored; reject clearly.
        return Response(
            content="postgres-sink expects OTLP JSON (set exporter encoding: json)",
            status_code=415,
        )

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return Response(content="invalid JSON", status_code=400)

    rows = _rows_from_payload(payload)
    if not rows:
        return Response(status_code=204)

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.executemany(INSERT_SQL, rows)
        conn.commit()

    return Response(status_code=204)


@app.on_event("shutdown")
def shutdown() -> None:
    pool.close()
