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

Write-Host "Build complete! The binary is located at Backend\gamez-server.exe"
