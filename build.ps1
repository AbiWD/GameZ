$ErrorActionPreference = 'Stop'

Write-Host "Building Admin UI..."
Set-Location Frontend\Admin
npm run build
Set-Location ..\..

Write-Host "Building Website UI..."
Set-Location Frontend\Website
npm run build
Set-Location ..\..

Write-Host "Copying Admin dist to Backend for embedding..."
if (Test-Path Backend\ui\admin) {
    Remove-Item -Recurse -Force Backend\ui\admin
}
New-Item -ItemType Directory -Force -Path Backend\ui\admin | Out-Null
Copy-Item -Recurse Frontend\Admin\dist\* Backend\ui\admin\

Write-Host "Copying Website dist to Backend\pb_public for local testing..."
if (Test-Path Backend\pb_public) {
    Remove-Item -Recurse -Force Backend\pb_public
}
New-Item -ItemType Directory -Force -Path Backend\pb_public | Out-Null
Copy-Item -Recurse Frontend\Website\dist\* Backend\pb_public\

Write-Host "Compiling Go binary..."
Set-Location Backend
go build -o gamez-server.exe
Set-Location ..

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " Build Complete! Created Backend\gamez-server.exe" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "`n⚠️  THE SERVER IS CURRENTLY OFF." -ForegroundColor Red
Write-Host "To START the server, copy & run these 2 lines in PowerShell:" -ForegroundColor Cyan
Write-Host "  cd Backend" -ForegroundColor Yellow
Write-Host "  .\gamez-server.exe serve --http=`"127.0.0.1:8090`"`n" -ForegroundColor Yellow
Write-Host "After starting the server, open these links:" -ForegroundColor Cyan
Write-Host "  - Admin Portal:      http://localhost:8090/admin/" -ForegroundColor White
Write-Host "  - Customer Website:  http://localhost:8090/" -ForegroundColor White
Write-Host "  - REST API:          http://localhost:8090/api/" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Green
