# Configure Claude Code for this local OTel stack (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ClaudeDir = Join-Path $env:USERPROFILE ".claude"
$Settings = Join-Path $ClaudeDir "settings.json"

New-Item -ItemType Directory -Force -Path $ClaudeDir | Out-Null

$data = @{}
if (Test-Path $Settings) {
  try {
    $data = Get-Content $Settings -Raw | ConvertFrom-Json -AsHashtable
  } catch {
    $data = @{}
  }
}
if (-not $data) { $data = @{} }
if (-not $data.ContainsKey("env")) { $data["env"] = @{} }

$envMap = $data["env"]
$envMap["CLAUDE_CODE_ENABLE_TELEMETRY"] = "1"
$envMap["OTEL_METRICS_EXPORTER"] = "otlp"
$envMap["OTEL_LOGS_EXPORTER"] = "otlp"
$envMap["OTEL_TRACES_EXPORTER"] = "otlp"
$envMap["CLAUDE_CODE_ENHANCED_TELEMETRY_BETA"] = "1"
$envMap["OTEL_EXPORTER_OTLP_PROTOCOL"] = "grpc"
$envMap["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4317"
$envMap["OTEL_LOG_USER_PROMPTS"] = "1"
$envMap["OTEL_LOG_ASSISTANT_RESPONSES"] = "1"
$envMap["OTEL_LOG_TOOL_DETAILS"] = "1"
$envMap["OTEL_METRIC_EXPORT_INTERVAL"] = "10000"
$envMap["OTEL_LOGS_EXPORT_INTERVAL"] = "5000"
$envMap["OTEL_RESOURCE_ATTRIBUTES"] = "deployment.environment=local"

($data | ConvertTo-Json -Depth 8) + "`n" | Set-Content -Path $Settings -Encoding UTF8
Write-Host "Updated $Settings"

$ProfilePath = $PROFILE
$MarkerBegin = "# >>> claude-code-otel >>>"
$MarkerEnd = "# <<< claude-code-otel <<<"
$Block = @"
$MarkerBegin
# Claude Code OpenTelemetry → local Docker stack (claude-code-otel)
`$env:CLAUDE_CODE_ENABLE_TELEMETRY = "1"
`$env:OTEL_METRICS_EXPORTER = "otlp"
`$env:OTEL_LOGS_EXPORTER = "otlp"
`$env:OTEL_TRACES_EXPORTER = "otlp"
`$env:CLAUDE_CODE_ENHANCED_TELEMETRY_BETA = "1"
`$env:OTEL_EXPORTER_OTLP_PROTOCOL = "grpc"
`$env:OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317"
`$env:OTEL_LOG_USER_PROMPTS = "1"
`$env:OTEL_LOG_ASSISTANT_RESPONSES = "1"
`$env:OTEL_LOG_TOOL_DETAILS = "1"
`$env:OTEL_METRIC_EXPORT_INTERVAL = "10000"
`$env:OTEL_LOGS_EXPORT_INTERVAL = "5000"
`$env:OTEL_RESOURCE_ATTRIBUTES = "deployment.environment=local"
$MarkerEnd
"@

if (-not (Test-Path (Split-Path $ProfilePath -Parent))) {
  New-Item -ItemType Directory -Force -Path (Split-Path $ProfilePath -Parent) | Out-Null
}
if (-not (Test-Path $ProfilePath)) {
  New-Item -ItemType File -Force -Path $ProfilePath | Out-Null
}

$existing = Get-Content $ProfilePath -Raw -ErrorAction SilentlyContinue
if ($existing -and $existing.Contains($MarkerBegin)) {
  $pattern = "(?s)$([regex]::Escape($MarkerBegin)).*?$([regex]::Escape($MarkerEnd))"
  $existing = [regex]::Replace($existing, $pattern, "").TrimEnd()
  Set-Content -Path $ProfilePath -Value ($existing + "`n`n" + $Block + "`n") -Encoding UTF8
  Write-Host "Refreshed OTel block in $ProfilePath"
} else {
  Add-Content -Path $ProfilePath -Value ("`n" + $Block + "`n") -Encoding UTF8
  Write-Host "Appended OTel block to $ProfilePath"
}

Write-Host ""
Write-Host "Done. Restart Claude Code / Claude Desktop so OTel exporters re-initialize."
Write-Host "Verify: claude -p 'otel smoke test'"
Write-Host "Then open Analytics http://localhost:3010 and Grafana http://localhost:3000"
Write-Host ""
Write-Host "Note: Claude Desktop MDM (.mobileconfig) is macOS-only."
Write-Host "On Windows, Code-tab sessions use ~/.claude/settings.json (already updated)."
