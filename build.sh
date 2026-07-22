#!/bin/bash
set -e

echo "Building Admin UI..."
cd Frontend/Admin
npm run build
cd ../../

echo "Building Website UI..."
cd Frontend/Website
npm run build
cd ../../

echo "Copying Admin dist to Backend for embedding..."
rm -rf Backend/ui/admin
mkdir -p Backend/ui/admin
cp -r Frontend/Admin/dist/* Backend/ui/admin/

echo "Compiling Go binary..."
cd Backend
go build -o gamez-server
cd ..

echo "Build complete! The binary is located at Backend/gamez-server"
