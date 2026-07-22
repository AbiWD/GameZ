#!/bin/bash
# ── GameZ Production Remote Deployment Script ──
set -e

SERVER_IP="${1}"
if [ -z "$SERVER_IP" ]; then
    echo "Usage: ./deploy/deploy.sh <SERVER_IP_OR_HOSTNAME>"
    exit 1
fi

echo "1. Building production single-binary & website assets..."
./build.sh

echo "2. Deploying binary & pb_public static assets to ${SERVER_IP}:/opt/gamez/..."
rsync -avz --progress Backend/gamez-server root@${SERVER_IP}:/opt/gamez/gamez-server
rsync -avz --delete --progress Backend/pb_public/ root@${SERVER_IP}:/opt/gamez/pb_public/

echo "3. Restarting gamez systemd service..."
ssh root@${SERVER_IP} "systemctl restart gamez && systemctl status gamez --no-pager"

echo "Deployment complete! Live at https://gamezcafe.com"
