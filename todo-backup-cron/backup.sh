#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is missing"
  exit 1
fi

if [ -z "${BUCKET_NAME:-}" ]; then
  echo "BUCKET_NAME is missing"
  exit 1
fi

if [ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  echo "GOOGLE_APPLICATION_CREDENTIALS is missing"
  exit 1
fi

BACKUP_FILE="/tmp/todo-backup-$(date -u +%Y-%m-%dT%H-%M-%SZ).sql"

echo "Authenticating to Google Cloud"
gcloud auth activate-service-account \
  --key-file="$GOOGLE_APPLICATION_CREDENTIALS"

echo "Creating database backup: $BACKUP_FILE"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

echo "Uploading backup to gs://$BUCKET_NAME/"
gcloud storage cp "$BACKUP_FILE" "gs://$BUCKET_NAME/"

echo "Backup uploaded successfully"