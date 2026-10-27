export function getRoiAssumptions() {
  const hours = Number(process.env.AVG_HOURS_SAVED_PER_SESSION ?? "0.5");
  const hourly = Number(process.env.HOURLY_ENGINEER_COST_USD ?? "75");
  return {
    avgHoursSavedPerSession: Number.isFinite(hours) ? hours : 0.5,
    hourlyEngineerCostUsd: Number.isFinite(hourly) ? hourly : 75,
  };
}

export function getPrometheusUrl() {
  return process.env.PROMETHEUS_URL ?? "http://localhost:9090";
}

export function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    "postgresql://claude:changeme_local_only@localhost:5432/claude_otel"
  );
}

export function getGrafanaUrl() {
  return process.env.GRAFANA_URL ?? "http://localhost:3000";
}
