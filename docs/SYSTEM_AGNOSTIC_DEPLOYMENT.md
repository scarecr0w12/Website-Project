# System-Agnostic Deployment Guide

## Overview

This deployment guide provides comprehensive instructions for deploying the Viral Content Website on any platform using Docker Compose v2 features. The system is designed to be completely platform-independent and can run on:

- **Linux servers** (Ubuntu, CentOS, Debian, etc.)
- **macOS** (Intel and Apple Silicon)
- **Windows** (with Docker Desktop)
- **Cloud platforms** (AWS, GCP, Azure, DigitalOcean)
- **Container orchestration** (Docker Swarm, Kubernetes)
- **ARM-based systems** (Raspberry Pi, AWS Graviton)

## Prerequisites

### System Requirements

- **Docker Engine** 20.10.0+ with Docker Compose v2
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: 10GB+ available disk space
- **Network**: Internet connectivity for image downloads and API access

### Platform-Specific Setup

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose-plugin

# CentOS/RHEL
sudo yum install docker docker-compose-plugin
sudo systemctl enable --now docker
```

#### macOS
```bash
# Install Docker Desktop from https://docker.com
# Or use Homebrew
brew install --cask docker
```

#### Windows
```powershell
# Install Docker Desktop from https://docker.com
# Or use Chocolatey
choco install docker-desktop
```

## Quick Start

### 1. Initial Setup

```bash
# Clone or download the project
git clone <repository-url>
cd viral-content-website

# Run system-agnostic setup
make setup
# Or manually:
mkdir -p data generated-content logs backups/analytics nginx
cp .env.example .env
```

### 2. Configure Environment

Edit the `.env` file for your platform:

```bash
# Basic Configuration
NODE_ENV=production
COMPOSE_PROJECT_NAME=viral-content
VERSION=latest

# Platform-specific paths (adjust as needed)
DATA_PATH=./data
CONTENT_PATH=./generated-content
LOGS_PATH=./logs
BACKUP_PATH=./backups

# Network configuration (avoid conflicts)
INTERNAL_SUBNET=172.20.0.0/16
ANALYTICS_SUBNET=172.21.0.0/16

# Required: Add your LLM API key
LLM_API_KEY=your-actual-api-key-here
```

### 3. Deploy

Choose your deployment scenario:

```bash
# Development environment
make dev

# Production (basic)
make deploy

# Production with all features
make deploy-full
```

## Deployment Scenarios

### Development Environment

**Purpose**: Local development with hot reload and debugging

```bash
# Start development environment
make dev

# Or with Docker Compose v2 features
make dev-v2

# Access development tools
make tools
```

**Features**:
- Hot reload for code changes
- Debug port (9229) exposed
- Development database browser
- Source code bind mounting
- Development-optimized containers

**Access Points**:
- **Application**: http://localhost:3000
- **Debug**: http://localhost:9229
- **Database Browser**: http://localhost:8080 (with `make db-shell`)

### Production Deployment

#### Basic Production

```bash
make deploy
```

**Features**:
- Optimized production containers
- Health checks
- Restart policies
- Basic logging

#### Full Production Stack

```bash
make deploy-full
```

**Features**:
- Nginx reverse proxy
- Analytics (Umami + PostgreSQL)
- Automated backups
- Multi-architecture support
- Advanced networking

**Access Points**:
- **Application**: http://localhost:80, https://localhost:443
- **Analytics**: http://localhost:3001
- **Admin Panel**: http://localhost:3000/admin

### Cloud Deployment

#### AWS/GCP/Azure

```bash
# Set cloud-specific environment variables
export NODE_ENV=production
export BACKUP_PATH=/mnt/backups
export DATA_PATH=/mnt/data
export CORS_ORIGINS=https://yourdomain.com

# Deploy with cloud configuration
make deploy-full
```

#### Kubernetes

```bash
# Convert Docker Compose to Kubernetes manifests
kompose convert -f docker-compose.v2.yml

# Or use the provided Kubernetes configurations
kubectl apply -f k8s/
```

## System-Specific Optimizations

### Linux Server Optimization

```bash
# Update .env for Linux
MOUNT_CONSISTENCY=consistent
CHOKIDAR_USEPOLLING=false
NGINX_WORKERS=auto
VOLUME_TYPE=none
```

### macOS/Windows (Docker Desktop)

```bash
# Update .env for Docker Desktop
MOUNT_CONSISTENCY=cached
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

### ARM64 (Apple Silicon, AWS Graviton)

```bash
# Multi-architecture builds are automatic
# No special configuration needed
export DOCKER_PLATFORM=linux/arm64
```

### Resource-Constrained Systems

```bash
# Reduce resource usage
NODE_OPTIONS="--max-old-space-size=512"
NGINX_WORKERS=1
NGINX_CONNECTIONS=512
```

## Network Configuration

### Default Network Setup

The system creates isolated networks for security:

- **viral-content-network**: Main application network
- **analytics-network**: Analytics services
- **external-network**: Public-facing services

### Custom Network Configuration

```bash
# Update .env for custom networks
INTERNAL_SUBNET=10.1.0.0/16
ANALYTICS_SUBNET=10.2.0.0/16
EXTERNAL_SUBNET=10.3.0.0/16
```

### Firewall Configuration

```bash
# Allow required ports
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS  
sudo ufw allow 3000  # Application (if direct access needed)
```

## Storage and Persistence

### Volume Management

The system uses named volumes for persistence:

```bash
# View volumes
docker volume ls | grep viral-content

# Backup volumes
make backup

# Migrate volumes between systems
docker run --rm -v viral-content-app-data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz -C /data .
```

### Storage Backends

#### Local Storage
```bash
# Default configuration
VOLUME_TYPE=none
DATA_PATH=./data
```

#### Network Storage (NFS/CIFS)
```bash
VOLUME_TYPE=nfs
DATA_PATH=nfs-server:/path/to/data
```

#### Cloud Storage
```bash
# AWS EFS
VOLUME_TYPE=efs
DATA_PATH=efs-id.efs.region.amazonaws.com:/

# Google Cloud Filestore
VOLUME_TYPE=nfs
DATA_PATH=filestore-ip:/share-name
```

## Security Configuration

### Production Security

```bash
# Generate secure secrets
openssl rand -base64 32  # For session secrets
openssl rand -hex 32     # For API keys
```

Update `.env`:
```bash
ADMIN_SESSION_SECRET=your-generated-secret
ANALYTICS_APP_SECRET=your-generated-secret
CORS_ORIGINS=https://yourdomain.com
```

### SSL/TLS Configuration

```bash
# Place SSL certificates in nginx directory
mkdir -p nginx/certs
cp your-cert.pem nginx/certs/
cp your-key.pem nginx/certs/

# Update nginx configuration
NGINX_CONFIG_PATH=./nginx/nginx-ssl.conf
```

### Docker Secrets (Production)

```bash
# Create Docker secrets
echo "your-api-key" | docker secret create viral-content-llm-api-key -
echo "your-session-secret" | docker secret create viral-content-admin-session-secret -

# Deploy with secrets
docker compose -f docker-compose.v2.yml --profile production up -d
```

## Monitoring and Maintenance

### Health Monitoring

```bash
# Check service health
make health

# View logs
make logs
make logs-web
make logs-scheduler
```

### Automated Backups

```bash
# Configure backup schedule in .env
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=7

# Manual backup
make backup

# Restore from backup
BACKUP_FILE=./backups/backup-file.tar.gz make restore
```

### Updates and Maintenance

```bash
# Update containers
make update

# Restart services
make restart

# Security scan
make security-scan

# Clean up old containers/images
make clean
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Change default ports in .env
PORT=3001
HTTP_PORT=8080
HTTPS_PORT=8443
```

#### Permission Issues (Linux)
```bash
# Fix ownership
sudo chown -R $USER:$USER data generated-content logs backups
```

#### Memory Issues
```bash
# Reduce memory usage
NODE_OPTIONS="--max-old-space-size=512"
```

#### Network Issues
```bash
# Reset Docker networks
make clean
make setup
```

### Platform-Specific Fixes

#### macOS File Watching
```bash
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

#### Windows Path Issues
```bash
# Use forward slashes in paths
DATA_PATH=./data
CONTENT_PATH=./generated-content
```

#### Linux SELinux
```bash
# Set SELinux context for volumes
sudo setsebool -P container_manage_cgroup on
```

## Performance Optimization

### Database Optimization

```bash
# Optimize SQLite for production
echo "PRAGMA journal_mode=WAL;" | sqlite3 data/articles.db
echo "PRAGMA synchronous=NORMAL;" | sqlite3 data/articles.db
```

### Caching Configuration

```bash
# Enable Redis caching (optional)
docker run -d --name redis --network viral-content-network redis:alpine
```

### Resource Limits

Add to `docker-compose.v2.yml`:
```yaml
services:
  web:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Scaling and High Availability

### Horizontal Scaling

```bash
# Scale web service
docker compose -f docker-compose.v2.yml up --scale web=3 -d
```

### Load Balancing

Configure Nginx for load balancing:
```nginx
upstream backend {
    server web:3000;
    server web:3000;
    server web:3000;
}
```

### Database Replication

For high availability, consider:
- PostgreSQL with streaming replication
- Database clustering solutions
- Automated failover mechanisms

## Migration Guide

### From Docker Compose v1

```bash
# Backup existing data
make backup

# Stop old services
docker-compose down

# Migrate to v2
docker compose -f docker-compose.v2.yml up -d

# Verify migration
make health
```

### Between Platforms

```bash
# Export data
docker run --rm -v viral-content-app-data:/data -v $(pwd):/backup alpine tar czf /backup/migration.tar.gz -C /data .

# Transfer to new platform and import
docker run --rm -v viral-content-app-data:/data -v $(pwd):/backup alpine tar xzf /backup/migration.tar.gz -C /data
```

## Support and Resources

- **Documentation**: Check `docs/` directory
- **Issues**: Report on GitHub repository
- **Logs**: Located in `logs/` directory
- **Health Checks**: `make health` command
- **Configuration**: `.env` file and Docker Compose files

## Conclusion

This system-agnostic deployment approach ensures that the Viral Content Website can run consistently across any platform or environment. The Docker Compose v2 configuration provides advanced features like multi-platform builds, improved networking, and better resource management while maintaining portability and ease of use.
