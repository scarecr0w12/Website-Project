# 🚀 InsightHub - Complete Deployment Guide

This guide provides comprehensive instructions for deploying the **complete InsightHub system** including the enterprise admin panel, user management, SEO analytics, and automated content generation.

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Quick Start](#quick-start)
3. [Environment Configuration](#environment-configuration)
4. [Development Deployment](#development-deployment)
5. [Production Deployment](#production-deployment)
6. [Admin Panel Setup](#admin-panel-setup)
7. [Security Configuration](#security-configuration)
8. [Analytics & Monitoring](#analytics--monitoring)
9. [Backup & Maintenance](#backup--maintenance)
10. [Troubleshooting](#troubleshooting)

## 🎯 System Overview

### What You're Deploying

The complete InsightHub system includes:

- **🤖 AI Content Generation**: Automated viral content creation
- **🎛️ Enterprise Admin Panel**: Complete user and content management
- **👥 Advanced User Management**: CRUD operations with role-based permissions
- **📊 SEO Analytics Dashboard**: Performance tracking and optimization
- **🔐 Security Features**: 2FA, password reset, audit logging
- **⚙️ Settings Management**: Comprehensive configuration system
- **📱 Responsive UI**: Professional admin interface
- **🐳 Container Orchestration**: Production-ready Docker deployment

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │────│   Node.js App   │────│   SQLite DB     │
│   (Port 80/443) │    │   (Port 3000)   │    │   (Persistent)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────────────┐       ┌──────────────┐       ┌──────────────┐
    │   Admin    │       │   Content    │       │   Backup     │
    │   Panel    │       │  Generator   │       │   System     │
    └────────────┘       └──────────────┘       └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ available RAM
- 10GB+ available disk space

### One-Command Deployment

```bash
# Development environment
docker compose -f docker-compose.dev.yml up -d

# Production environment
docker compose --profile production up -d

# With analytics
docker compose --profile production --profile analytics up -d
```

## 🎛️ Admin Panel Setup

### First-Time Setup

After deployment, complete these steps:

#### 1. Access Admin Panel

```bash
# Visit admin login page
https://yourdomain.com/admin/login

# Default credentials (check server logs)
Username: admin
Password: [auto-generated - check container logs]
```

#### 2. Initial Configuration

1. **Change Default Password**
   - Login with default credentials
   - Go to Security settings
   - Change admin password immediately

2. **Enable Two-Factor Authentication**
   - Navigate to Security → 2FA Setup
   - Scan QR code with authenticator app
   - Save backup codes securely

3. **Configure Site Settings**
   - Site name and description
   - Contact information
   - Timezone settings

#### 3. User Management Setup

1. **Create Additional Admin Users**
   - Go to Users → New User
   - Set role as "Admin"
   - Configure permissions

2. **Set Up Editor/Contributor Accounts**
   - Create users with appropriate roles
   - Configure content creation permissions
   - Set up email notifications

### Admin Panel Features Configuration

#### Content Generation Settings

```bash
# Configure in Admin Panel → Settings → Content
- Generation Frequency: Every 6 hours
- Content Topics: technology,health,finance,business
- Auto-publish: Enable/Disable
- AI Model: gpt-3.5-turbo or gpt-4
- Max Tokens: 1500
- Temperature: 0.7
```

#### SEO Analytics Setup

1. **Google Analytics Integration** (Optional)
   - Settings → SEO → Google Analytics
   - Add tracking ID: GA_TRACKING_ID
   - Enable enhanced ecommerce

2. **SEO Optimization Settings**
   - Default meta description template
   - Sitemap generation frequency
   - Schema markup configuration

#### Security Configuration

1. **Session Management**
   - Session timeout: 30 minutes (recommended)
   - Maximum login attempts: 5
   - Account lockout duration: 15 minutes

2. **Password Policy**
   - Minimum length: 8 characters
   - Require mixed case: Yes
   - Require numbers: Yes
   - Require special characters: Yes

3. **Audit Logging**
   - Enable comprehensive logging
   - Log retention: 90 days
   - Log failed login attempts

### Email Configuration

For password reset functionality:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=InsightHub Admin
```

### Admin Panel URLs

After deployment, these URLs are available:

- **Admin Login**: `/admin/login`
- **Dashboard**: `/admin/dashboard.html`
- **Password Reset**: `/admin/reset-password.html`
- **User Management**: Dashboard → Users section
- **Content Management**: Dashboard → Articles section
- **SEO Analytics**: Dashboard → Analytics section
- **Settings**: Dashboard → Settings section

## 🔐 Security Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Core Application
NODE_ENV=production
PORT=3000
DATABASE_PATH=/app/data/articles.db

# LLM Configuration (Required for content generation)
LLM_API_KEY=your-openai-api-key-here
LLM_API_URL=https://api.openai.com/v1
LLM_MAX_TOKENS=1500
LLM_TEMPERATURE=0.7

# Content Generation Settings
CONTENT_GENERATION_ENABLED=true
CONTENT_GENERATION_INTERVAL=3600000
MAX_ARTICLES_PER_DAY=24
CONTENT_TOPICS=business,finance,technology,entrepreneurship,health

# Security & Performance
API_RATE_LIMIT=100
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Analytics (Optional)
ANALYTICS_ENABLED=true
ANALYTICS_HASH_SALT=your-random-salt-here

# Monitoring
PERFORMANCE_TRACKING=true
```

### Optional Configuration

```bash
# Custom domain and SSL
DOMAIN=yourdomain.com
SSL_EMAIL=your-email@domain.com

# Database backup
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=30

# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🔧 Development Deployment

Perfect for local development and testing:

```bash
# Start development environment
npm run docker:dev

# Or manually
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down
```

**Development Features:**
- Hot reloading enabled
- Debug mode active
- Relaxed security headers
- Local file mounting
- Port 3000 exposed directly

**Access Points:**
- Website: http://localhost:3000
- API: http://localhost:3000/api/v1
- Health Check: http://localhost:3000/health

## 🌍 Production Deployment

### Basic Production Setup

```bash
# Build and start production services
docker compose --profile production up -d

# Check service status
docker compose ps

# View production logs
docker compose logs -f web
```

### Production with SSL (Recommended)

1. **Configure DNS**: Point your domain to your server's IP
2. **Update nginx configuration**: Edit `nginx/nginx.conf` with your domain
3. **Deploy with SSL**:

```bash
# Start with nginx proxy and SSL
DOMAIN=yourdomain.com docker compose --profile production up -d
```

### Production with Analytics

```bash
# Start all services including Umami analytics
docker compose --profile production --profile analytics up -d
```

**Production Features:**
- Nginx reverse proxy
- SSL/TLS termination
- Automatic content generation
- Health monitoring
- Log aggregation
- Database persistence
- Automatic restarts

**Access Points:**
- Website: https://yourdomain.com
- Analytics: http://yourdomain.com:3001 (default: admin/umami)
- API: https://yourdomain.com/api/v1

## 📊 Analytics & Monitoring

### Umami Analytics Setup

1. **Enable analytics profile**:
```bash
docker compose --profile analytics up -d
```

2. **Access Umami dashboard**: http://localhost:3001
   - Username: `admin`
   - Password: `umami`

3. **Add tracking code**: Copy tracking script from Umami to your site

### Health Monitoring

The system includes comprehensive health checks:

```bash
# Check all service health
docker compose ps

# Detailed health status
curl http://localhost:3000/health

# Service logs
docker compose logs -f web
docker compose logs -f content-scheduler
```

### Log Management

Logs are stored in `./logs/` directory:
- `app.log`: Application logs
- `error.log`: Error logs
- `access.log`: HTTP access logs
- `nginx/`: Nginx logs (production)

## 💾 Backup & Maintenance

### Database Backup

```bash
# Manual backup
docker compose exec web sqlite3 /app/data/articles.db ".backup /app/data/backup-$(date +%Y%m%d).db"

# Automated daily backups (add to crontab)
0 2 * * * cd /path/to/project && docker compose exec web sqlite3 /app/data/articles.db ".backup /app/data/backup-$(date +%Y%m%d).db"
```

### Content Backup

Generated content is automatically saved to `./generated-content/`:
- Article JSON files
- Markdown content
- Metadata

### System Updates

```bash
# Pull latest images
docker compose pull

# Rebuild and restart
docker compose up -d --build

# Clean old images
docker image prune -a
```

### Scaling

Scale individual services:

```bash
# Scale content generation
docker compose up -d --scale content-scheduler=2

# Scale web servers (with load balancer)
docker compose up -d --scale web=3
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker compose logs service-name

# Check resource usage
docker stats

# Restart specific service
docker compose restart service-name
```

#### Database Issues
```bash
# Check database file permissions
ls -la ./data/

# Fix permissions
sudo chown -R 1000:1000 ./data/

# Database integrity check
docker compose exec web sqlite3 /app/data/articles.db "PRAGMA integrity_check;"
```

#### Network Issues
```bash
# Check network connectivity
docker network ls
docker network inspect viral-content-network

# Recreate network
docker compose down
docker network rm viral-content-network
docker compose up -d
```

### Performance Optimization

#### Memory Usage
```bash
# Check memory usage
docker stats --no-stream

# Limit memory per service (in docker-compose.yml)
services:
  web:
    deploy:
      resources:
        limits:
          memory: 512M
```

#### Storage Cleanup
```bash
# Clean generated content older than 30 days
find ./generated-content -name "*.json" -mtime +30 -delete

# Clean old log files
find ./logs -name "*.log" -mtime +7 -delete
```

## 🔐 Security Considerations

### Environment Security
- Use strong, unique passwords
- Rotate API keys regularly
- Enable HTTPS in production
- Use environment variables for secrets

### Network Security
```bash
# Update firewall rules (Ubuntu/Debian)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # Block direct app access
```

### Container Security
- Run containers as non-root user
- Use official, updated base images
- Scan images for vulnerabilities
- Enable Docker security features

## 📞 Support

### Health Endpoints
- `GET /health` - Application health status
- `GET /api/v1/health` - API health status
- `GET /metrics` - Performance metrics

### Monitoring Commands
```bash
# Real-time container stats
docker compose exec web top

# System resource usage
docker system df

# Service connectivity test
docker compose exec web curl -f http://content-scheduler:3000/health
```

---

## 📋 Quick Reference

### Essential Commands
```bash
# Start development
npm run docker:dev

# Start production
docker compose --profile production up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Update and restart
docker compose pull && docker compose up -d --build

# Backup database
docker compose exec web sqlite3 /app/data/articles.db ".backup backup.db"
```

### Directory Structure
```
/
├── docker-compose.yml          # Main compose file
├── docker-compose.dev.yml      # Development overrides
├── Dockerfile                  # Main app container
├── Dockerfile.scheduler        # Scheduler container
├── nginx/                      # Nginx configuration
├── data/                       # Persistent database
├── logs/                       # Application logs
├── generated-content/          # Content backups
└── .env                        # Environment variables
```

This deployment guide ensures professional-grade deployment capabilities with monitoring, scaling, and maintenance procedures.
