#!/bin/bash
# ── GameZ Production Remote Deployment Script ──
set -e

SERVER_IP="${1}"
if [ -z "$SERVER_IP" ]; then
    echo "Usage: ./deploy/deploy.sh <SERVER_IP_OR_HOSTNAME>"
    exit 1
fi

echo "1. Building frontend assets..."
./build.sh

echo "2. Cross-compiling Linux binary (GOOS=linux GOARCH=amd64) for cloud server..."
cd Backend
GOOS=linux GOARCH=amd64 go build -o gamez-server-linux
cd ..

# NOTE: Ensure /opt/gamez/.env exists on the target server with SMTP/S3 credentials before initial launch.

echo "3. Creating pre-deployment database backup on remote server..."
ssh root@${SERVER_IP} "if [ -d /opt/gamez/pb_data ]; then cp -r /opt/gamez/pb_data /opt/gamez/pb_data_backup_\$(date +%Y%m%d_%H%M%S); fi"

echo "4. Deploying cross-compiled Linux binary & pb_public static assets..."
rsync -avz --progress Backend/gamez-server-linux root@${SERVER_IP}:/opt/gamez/gamez-server
rsync -avz --delete --progress Backend/pb_public/ root@${SERVER_IP}:/opt/gamez/pb_public/

echo "5. Restarting gamez systemd service..."
ssh root@${SERVER_IP} "systemctl restart gamez && systemctl status gamez --no-pager"

echo "Deployment complete! Live at https://gamezcafe.com"
