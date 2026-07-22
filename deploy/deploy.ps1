# ── GameZ Production Remote Deployment Script (PowerShell) ──
$ErrorActionPreference = 'Stop'

param (
    [Parameter(Mandatory=$true)]
    [string]$ServerIP
)

Write-Host "1. Building frontend assets and local binary..."
.\build.ps1

Write-Host "2. Cross-compiling Linux binary (GOOS=linux GOARCH=amd64) for cloud server..."
Set-Location Backend
$env:GOOS = 'linux'
$env:GOARCH = 'amd64'
go build -o gamez-server-linux
Remove-Item Env:\GOOS -ErrorAction SilentlyContinue
Remove-Item Env:\GOARCH -ErrorAction SilentlyContinue
Set-Location ..

# NOTE: Ensure /opt/gamez/.env exists on target server before initial launch.

Write-Host "3. Creating pre-deployment database backup on remote server..."
ssh root@$ServerIP "if [ -d /opt/gamez/pb_data ]; then cp -r /opt/gamez/pb_data /opt/gamez/pb_data_backup_\$(date +%Y%m%d_%H%M%S); fi"

Write-Host "4. Deploying Linux binary & pb_public static assets..."
scp Backend\gamez-server-linux root@${ServerIP}:/opt/gamez/gamez-server
scp -r Backend\pb_public\* root@${ServerIP}:/opt/gamez/pb_public/

Write-Host "5. Restarting gamez systemd service..."
ssh root@$ServerIP "systemctl restart gamez && systemctl status gamez --no-pager"

Write-Host "Deployment complete! Live at https://gamezcafe.com"
