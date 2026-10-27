# Start the Claude Code OTel stack (Windows PowerShell)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path ".env")) {
  Write-Host "No .env found — copying .env.example"
  Copy-Item ".env.example" ".env"
  Write-Host "Edit .env to set strong local passwords, then re-run if desired."
}

# Load simple KEY=VALUE lines from .env into process env
Get-Content ".env" | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $parts = $line -split "=", 2
  if ($parts.Length -eq 2) {
    [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
  }
}

$AnalyticsPort = if ($env:ANALYTICS_PORT) { $env:ANALYTICS_PORT } else { "3010" }

Write-Host "Starting Claude Code OTel stack..."
docker compose up -d --build

Write-Host ""
Write-Host "Waiting for services..."
for ($i = 0; $i -lt 90; $i++) {
  $grafanaOk = $false
  $analyticsOk = $false
  try {
    Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
    $grafanaOk = $true
  } catch {}
  try {
    Invoke-WebRequest -Uri "http://127.0.0.1:$AnalyticsPort/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
    $analyticsOk = $true
  } catch {}
  if ($grafanaOk -and $analyticsOk) { break }
  Start-Sleep -Seconds 2
}

docker compose ps
Write-Host ""
Write-Host "Analytics:   http://localhost:$AnalyticsPort  (executive ROI UI)"
Write-Host "Grafana:     http://localhost:3000             (ops dashboards)"
Write-Host "Prometheus:  http://localhost:9090"
Write-Host "Loki:        http://localhost:3100"
Write-Host "Tempo:       http://localhost:3200"
Write-Host "OTLP gRPC:   localhost:4317"
Write-Host "OTLP HTTP:   localhost:4318"
Write-Host "PostgreSQL:  localhost:5432  (see .env for credentials)"
Write-Host ""
Write-Host "Services use restart: unless-stopped — they return when Docker starts."
