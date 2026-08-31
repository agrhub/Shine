# Windows PowerShell Deploy Script for Render Worker on Google Cloud Run
param(
  [string]$ServiceName = "",
  [string]$Region = "",
  [string]$Memory = "",
  [string]$CPU = "",
  [string]$Timeout = "",
  [string]$MinInstances = "",
  [string]$MaxInstances = "",
  [string]$Concurrency = "",
  [string]$GcsBucket = ""
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
if (-not $ServiceName) { $ServiceName = if ($env:SERVICE_NAME) { $env:SERVICE_NAME } elseif ($EnvMap["RENDER_WORKER_SERVICE_NAME"]) { $EnvMap["RENDER_WORKER_SERVICE_NAME"] } else { "shine-render-worker" } }
if (-not $Region) { $Region = if ($env:REGION) { $env:REGION } elseif ($EnvMap["GCP_REGION"]) { $EnvMap["GCP_REGION"] } else { "us-central1" } }
if (-not $Memory) { $Memory = if ($env:MEMORY) { $env:MEMORY } elseif ($EnvMap["RENDER_WORKER_MEMORY"]) { $EnvMap["RENDER_WORKER_MEMORY"] } else { "4Gi" } }
if (-not $CPU) { $CPU = if ($env:CPU) { $env:CPU } elseif ($EnvMap["RENDER_WORKER_CPU"]) { $EnvMap["RENDER_WORKER_CPU"] } else { "2" } }
if (-not $Timeout) { $Timeout = if ($env:TIMEOUT) { $env:TIMEOUT } elseif ($EnvMap["RENDER_WORKER_TIMEOUT"]) { $EnvMap["RENDER_WORKER_TIMEOUT"] } else { "600" } }
if (-not $MinInstances) { $MinInstances = if ($env:MIN_INSTANCES) { $env:MIN_INSTANCES } elseif ($EnvMap["RENDER_WORKER_MIN_INSTANCES"]) { $EnvMap["RENDER_WORKER_MIN_INSTANCES"] } else { "0" } }
if (-not $MaxInstances) { $MaxInstances = if ($env:MAX_INSTANCES) { $env:MAX_INSTANCES } elseif ($EnvMap["RENDER_WORKER_MAX_INSTANCES"]) { $EnvMap["RENDER_WORKER_MAX_INSTANCES"] } else { "5" } }
if (-not $Concurrency) { $Concurrency = if ($env:CONCURRENCY) { $env:CONCURRENCY } elseif ($EnvMap["RENDER_WORKER_CONCURRENCY"]) { $EnvMap["RENDER_WORKER_CONCURRENCY"] } else { "10" } }
if (-not $GcsBucket) { $GcsBucket = if ($env:GCS_BUCKET) { $env:GCS_BUCKET } elseif ($EnvMap["GCS_BUCKET_NAME"]) { $EnvMap["GCS_BUCKET_NAME"] } else { "shine-studio-media" } }

$PoolSize = if ($env:RENDER_POOL_SIZE) { $env:RENDER_POOL_SIZE } elseif ($EnvMap["RENDER_POOL_SIZE"]) { $EnvMap["RENDER_POOL_SIZE"] } else { "4" }
$PoolMin = if ($env:RENDER_POOL_MIN) { $env:RENDER_POOL_MIN } elseif ($EnvMap["RENDER_POOL_MIN"]) { $EnvMap["RENDER_POOL_MIN"] } else { "1" }
$MaxPerInstance = if ($env:RENDER_MAX_PER_INSTANCE) { $env:RENDER_MAX_PER_INSTANCE } elseif ($EnvMap["RENDER_MAX_PER_INSTANCE"]) { $EnvMap["RENDER_MAX_PER_INSTANCE"] } else { "25" }

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " Deploying Video Render Worker to Google Cloud Run" -ForegroundColor Cyan
Write-Host " Service:       $ServiceName"
Write-Host " Region:        $Region"
Write-Host " Memory / CPU:  $Memory / $CPU CPU"
Write-Host " Timeout:       $Timeout seconds"
Write-Host " Min / Max:     $MinInstances / $MaxInstances instances"
Write-Host " Concurrency:   $Concurrency requests"
Write-Host " Render Pool:   Min $PoolMin / Max $PoolSize instances"
Write-Host " GCS Bucket:    $GcsBucket"
Write-Host "=========================================================" -ForegroundColor Cyan

# Auto-configure IAM Roles (GCS, Pub/Sub, Signed URL Token Creator)
try {
  $ProjectId = (gcloud config get-value project 2>&1).Trim()
  if ($ProjectId -and $ProjectId -notlike "*ERROR*") {
    $ProjectNumber = (gcloud projects describe $ProjectId --format "value(projectNumber)" 2>&1).Trim()
    if ($ProjectNumber -and $ProjectNumber -notlike "*ERROR*") {
      $ComputeSA = "$ProjectNumber-compute@developer.gserviceaccount.com"
      Write-Host "Ensuring IAM permissions for $ComputeSA..." -ForegroundColor Gray
      $Roles = @(
        "roles/storage.objectAdmin",
        "roles/pubsub.editor",
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

  # Ensure GCS CORS
  $CorsFile = Join-Path $RootDir "gcs-cors.json"
  if ($GcsBucket -and (Test-Path $CorsFile)) {
    gcloud storage buckets update "gs://$GcsBucket" --cors-file="$CorsFile" --quiet >$null 2>&1
  }
} catch {
  Write-Host "Notice: IAM / CORS configuration notice: $_" -ForegroundColor DarkYellow
}

gcloud run deploy $ServiceName `
  --source "$ScriptDir" `
  --region $Region `
  --memory $Memory `
  --cpu $CPU `
  --timeout $Timeout `
  --concurrency $Concurrency `
  --min-instances $MinInstances `
  --max-instances $MaxInstances `
  --set-env-vars "GCS_BUCKET=$GcsBucket,PUBSUB_TOPIC_STATUS=shine-render-status,RENDER_POOL_SIZE=$PoolSize,RENDER_POOL_MIN=$PoolMin,RENDER_MAX_PER_INSTANCE=$MaxPerInstance,GOOGLE_CLOUD_PROJECT=$ProjectId,GCP_REGION=$Region" `
  --allow-unauthenticated

if ($LASTEXITCODE -ne 0) {
  Write-Error "Deployment failed for $ServiceName with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

$Url = (gcloud run services describe $ServiceName --region $Region --format "value(status.url)").Trim()

Write-Host ""
Write-Host "✅ Video Render Worker Deployment Successful!" -ForegroundColor Green
Write-Host "Service URL: $Url" -ForegroundColor Yellow
Write-Host ""
Write-Host "Add this line to your Shine Server .env file:" -ForegroundColor White
Write-Host "RENDER_WORKER_URL=$Url" -ForegroundColor Cyan
