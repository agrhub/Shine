# Windows PowerShell Deploy Script for Demucs AI Worker on Google Cloud Run
param(
  [string]$ServiceName = "",
  [string]$Region = "",
  [string]$Memory = "",
  [string]$CPU = "",
  [string]$Timeout = "",
  [string]$MinInstances = "",
  [string]$MaxInstances = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PSScriptRoot }
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }

# Load .env from project root if available
$RootDir = (Resolve-Path "$ScriptDir\..\..").Path
$EnvFile = Join-Path $RootDir ".env"
$EnvMap = @{}
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
      $parts = $line.Split("=", 2)
      if ($parts.Length -eq 2) {
        $EnvMap[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
      }
    }
  }
}

# Resolve values: Parameter > Environment Variable > .env File > Default (2 CPU / 4Gi RAM)
if (-not $ServiceName) { $ServiceName = if ($env:SERVICE_NAME) { $env:SERVICE_NAME } elseif ($EnvMap["DEMUCS_WORKER_SERVICE_NAME"]) { $EnvMap["DEMUCS_WORKER_SERVICE_NAME"] } else { "demucs-worker" } }
if (-not $Region) { $Region = if ($env:REGION) { $env:REGION } elseif ($EnvMap["GCP_REGION"]) { $EnvMap["GCP_REGION"] } else { "us-central1" } }
if (-not $Memory) { $Memory = if ($env:MEMORY) { $env:MEMORY } elseif ($EnvMap["DEMUCS_WORKER_MEMORY"]) { $EnvMap["DEMUCS_WORKER_MEMORY"] } else { "4Gi" } }
if (-not $CPU) { $CPU = if ($env:CPU) { $env:CPU } elseif ($EnvMap["DEMUCS_WORKER_CPU"]) { $EnvMap["DEMUCS_WORKER_CPU"] } else { "2" } }
if (-not $Timeout) { $Timeout = if ($env:TIMEOUT) { $env:TIMEOUT } elseif ($EnvMap["DEMUCS_WORKER_TIMEOUT"]) { $EnvMap["DEMUCS_WORKER_TIMEOUT"] } else { "300" } }
if (-not $MinInstances) { $MinInstances = if ($env:MIN_INSTANCES) { $env:MIN_INSTANCES } elseif ($EnvMap["DEMUCS_WORKER_MIN_INSTANCES"]) { $EnvMap["DEMUCS_WORKER_MIN_INSTANCES"] } else { "0" } }
if (-not $MaxInstances) { $MaxInstances = if ($env:MAX_INSTANCES) { $env:MAX_INSTANCES } elseif ($EnvMap["DEMUCS_WORKER_MAX_INSTANCES"]) { $EnvMap["DEMUCS_WORKER_MAX_INSTANCES"] } else { "3" } }

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " Deploying Demucs Worker to Google Cloud Run" -ForegroundColor Cyan
Write-Host " Service:       $ServiceName"
Write-Host " Region:        $Region"
Write-Host " Memory / CPU:  $Memory / $CPU CPU"
Write-Host " Timeout:       $Timeout seconds"
Write-Host " Min / Max:     $MinInstances / $MaxInstances instances"
Write-Host "=========================================================" -ForegroundColor Cyan

# Auto-configure IAM Roles for Demucs Worker
try {
  $ProjectId = (gcloud config get-value project 2>&1).Trim()
  if ($ProjectId -and $ProjectId -notlike "*ERROR*") {
    $ProjectNumber = (gcloud projects describe $ProjectId --format "value(projectNumber)" 2>&1).Trim()
    if ($ProjectNumber -and $ProjectNumber -notlike "*ERROR*") {
      $ComputeSA = "$ProjectNumber-compute@developer.gserviceaccount.com"
      Write-Host "Ensuring IAM permissions for $ComputeSA..." -ForegroundColor Gray
      $Roles = @(
        "roles/storage.objectAdmin",
        "roles/iam.serviceAccountTokenCreator"
      )
      foreach ($role in $Roles) {
        gcloud projects add-iam-policy-binding $ProjectId `
          --member="serviceAccount:$ComputeSA" `
          --role="$role" `
          --condition=None `
          --quiet >$null 2>&1
      }
    }
  }
} catch {
  Write-Host "Notice: IAM configuration skipped: $_" -ForegroundColor DarkYellow
}

gcloud run deploy $ServiceName `
  --source "$ScriptDir" `
  --region $Region `
  --memory $Memory `
  --cpu $CPU `
  --timeout $Timeout `
  --min-instances $MinInstances `
  --max-instances $MaxInstances `
  --allow-unauthenticated

if ($LASTEXITCODE -ne 0) {
  Write-Error "Deployment failed for $ServiceName with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

$Url = (gcloud run services describe $ServiceName --region $Region --format "value(status.url)").Trim()

Write-Host ""
Write-Host "✅ Deployment Successful!" -ForegroundColor Green
Write-Host "Service URL: $Url" -ForegroundColor Yellow
Write-Host ""
Write-Host "Add this line to your Shine Server .env file:" -ForegroundColor White
Write-Host "DEMUCS_SERVICE_URL=$Url" -ForegroundColor Cyan
