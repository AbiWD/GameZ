# PocketBase Multi-Tenant Deployment Guide (AWS EC2)

This guide provides the steps to deploy your multi-tenant PocketBase architecture on a fresh AWS EC2 instance.

## 1. AWS Dashboard Prerequisites
1. Spin up an **Ubuntu 24.04** or **22.04 LTS** EC2 instance (A `t3.small` or `t3.micro` is fine to start).
2. Assign an **Elastic IP** to the EC2 instance (so the IP never changes if you stop the server).
3. In the EC2 Security Group, **open the following Inbound ports**:
   - `22` (SSH - specific to your IP)
   - `80` (HTTP - from Anywhere)
   - `443` (HTTPS - from Anywhere)

## 2. DNS Setup (Crucial for SSL)
Go to your Domain Registrar (e.g. Route53, GoDaddy, Namecheap) and create `A` records pointing to your Elastic IP.
- Record 1: `client-a` -> `YOUR_ELASTIC_IP`
- Record 2: `client-b` -> `YOUR_ELASTIC_IP`

## 3. Server Setup (SSH into EC2)
Run the following commands on your EC2 terminal to install Docker and Docker-Compose:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

dockerd-rootless-setuptool.sh install 

# Let your ubuntu user run docker commands without sudo
sudo usermod -aG docker ubuntu
```
*(You may need to logout and log back in for the docker group addition to take effect.)*

## 4. Deploying the Application
1. **Copy the `deployment` folder** from your local machine to the EC2 server. You can use Github, SCP, or a tool like Cyberduck.
2. Once the files are on the server, update the `Caddyfile` with your actual live domains (`client-a.yourdomain.com`, etc.).
3. Run the stack:

```bash
cd deployment
# Build and start the containers in detached mode
docker compose up -d --build
```

## 5. Verifying Deployment
Depending on your DNS propagation speed, your apps should now be live at `https://client-a.yourdomain.com` and `https://client-b.yourdomain.com/_/`! Caddy has automatically generated valid SSL certificates via Let's Encrypt.
