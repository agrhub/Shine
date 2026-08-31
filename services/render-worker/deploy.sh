#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$( cd "$DIR/../.." && pwd )"

# Load .env from project root if available
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source <(grep -v '^#' "$ROOT_DIR/.env" | sed -e 's/\r$//') 2>/dev/null || true
  set +a
fi

# Cloud Run Configuration (Defaults: 2 CPU / 4Gi RAM, Max 3 instances)
SERVICE_NAME="${SERVICE_NAME:-${RENDER_WORKER_SERVICE_NAME:-shine-render-worker}}"
REGION="${REGION:-${GCP_REGION:-us-central1}}"
MEMORY="${MEMORY:-${RENDER_WORKER_MEMORY:-4Gi}}"
CPU="${CPU:-${RENDER_WORKER_CPU:-2}}"
TIMEOUT="${TIMEOUT:-${RENDER_WORKER_TIMEOUT:-600}}"
MIN_INSTANCES="${MIN_INSTANCES:-${RENDER_WORKER_MIN_INSTANCES:-0}}"
MAX_INSTANCES="${MAX_INSTANCES:-${RENDER_WORKER_MAX_INSTANCES:-5}}"
CONCURRENCY="${CONCURRENCY:-${RENDER_WORKER_CONCURRENCY:-10}}"
GCS_BUCKET="${GCS_BUCKET:-${GCS_BUCKET_NAME:-shine-studio-media}}"
RENDER_POOL_SIZE="${RENDER_POOL_SIZE:-4}"
RENDER_POOL_MIN="${RENDER_POOL_MIN:-1}"
RENDER_MAX_PER_INSTANCE="${RENDER_MAX_PER_INSTANCE:-25}"

echo "========================================================="
echo " Deploying Video Render Worker to Google Cloud Run"
echo " Service:       $SERVICE_NAME"
echo " Region:        $REGION"
echo " Memory / CPU:  $MEMORY / $CPU CPU"
echo " Timeout:       $TIMEOUT seconds"
echo " Min / Max:     $MIN_INSTANCES / $MAX_INSTANCES instances"
echo " Concurrency:   $CONCURRENCY requests"
echo " Render Pool:   Min $RENDER_POOL_MIN / Max $RENDER_POOL_SIZE instances"
echo " GCS Bucket:    $GCS_BUCKET"
echo "========================================================="

# Auto-configure IAM Roles for Compute Service Account
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
if [ -n "$PROJECT_ID" ] && [[ "$PROJECT_ID" != *"ERROR"* ]]; then
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)" 2>/dev/null || true)
  if [ -n "$PROJECT_NUMBER" ] && [[ "$PROJECT_NUMBER" != *"ERROR"* ]]; then
    COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    ROLES=(
      "roles/storage.objectAdmin"
      "roles/pubsub.editor"
      "roles/iam.serviceAccountTokenCreator"
    )
    for role in "${ROLES[@]}"; do
      gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$COMPUTE_SA" \
        --role="$role" \
        --condition=None \
        --quiet >/dev/null 2>&1 || true
    done
  fi
fi

# Deploy from source using Cloud Build
gcloud run deploy "$SERVICE_NAME" \
  --source "$DIR" \
  --region "$REGION" \
  --memory "$MEMORY" \
  --cpu "$CPU" \
  --timeout "$TIMEOUT" \
  --concurrency "$CONCURRENCY" \
  --min-instances "$MIN_INSTANCES" \
  --max-instances "$MAX_INSTANCES" \
  --set-env-vars "GCS_BUCKET=$GCS_BUCKET,PUBSUB_TOPIC_STATUS=shine-render-status,RENDER_POOL_SIZE=$RENDER_POOL_SIZE,RENDER_POOL_MIN=$RENDER_POOL_MIN,RENDER_MAX_PER_INSTANCE=$RENDER_MAX_PER_INSTANCE,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GCP_REGION=$REGION" \
  --allow-unauthenticated

# Print service URL
URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
echo ""
echo "✅ Video Render Worker Deployment Successful!"
echo "Service URL: $URL"
echo ""
echo "Add this line to your Shine Server .env file:"
echo "RENDER_WORKER_URL=$URL"
