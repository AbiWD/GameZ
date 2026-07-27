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

echo "Copying Website dist to Backend/pb_public for local testing..."
rm -rf Backend/pb_public
mkdir -p Backend/pb_public
cp -r Frontend/Website/dist/* Backend/pb_public/

echo "Compiling Go binary..."
cd Backend
go build -o gamez-server
cd ..

echo ""
echo "======================================================="
echo " Build Complete! The executable is at Backend/gamez-server"
echo "======================================================="
echo ""
echo "To start the production server, run:"
echo "  cd Backend"
echo "  ./gamez-server serve --http=\"127.0.0.1:8090\""
echo ""
echo "Then access your applications at:"
echo "  - Admin Portal:      http://localhost:8090/admin/"
echo "  - Customer Website:  http://localhost:8090/"
echo "  - REST API:          http://localhost:8090/api/"
echo "======================================================="
