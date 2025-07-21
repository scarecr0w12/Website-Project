#!/bin/bash

# InsightHub Automated Deployment Script
# Usage: ./scripts/deploy.sh [environment] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
SKIP_BACKUP=false
SKIP_BUILD=false
SKIP_HEALTH=false
ANALYTICS=false
DRY_RUN=false

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

usage() {
    cat << EOF
InsightHub Deployment Script

Usage: $0 [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    dev         Development environment (default port 3000)
    production  Production environment with nginx
    staging     Staging environment

OPTIONS:
    --analytics     Enable analytics services (Umami)
    --skip-backup   Skip database backup before deployment
    --skip-build    Skip building containers
    --skip-health   Skip health checks after deployment
    --dry-run       Show what would be done without executing
    -h, --help      Show this help message

EXAMPLES:
    $0 production                    # Deploy to production
    $0 production --analytics        # Deploy with analytics
    $0 dev --skip-backup            # Quick dev deployment
    $0 production --dry-run         # Preview production deployment

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dev|development)
            ENVIRONMENT="dev"
            shift
            ;;
        prod|production)
            ENVIRONMENT="production"
            shift
            ;;
        staging)
            ENVIRONMENT="staging"
            shift
            ;;
        --analytics)
            ANALYTICS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-health)
            SKIP_HEALTH=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Pre-deployment checks
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running"
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker compose &> /dev/null; then
        error "Docker Compose is not available"
    fi
    
    # Check if .env file exists for production
    if [[ "$ENVIRONMENT" == "production" ]] && [[ ! -f ".env" ]]; then
        warn ".env file not found. Using default configuration."
    fi
    
    # Check available disk space (minimum 2GB)
    available_space=$(df . | tail -1 | awk '{print $4}')
    if [[ $available_space -lt 2097152 ]]; then
        warn "Low disk space: $(($available_space / 1024))MB available"
    fi
    
    log "Prerequisites check completed"
}

# Backup database
backup_database() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        info "Skipping database backup"
        return
    fi
    
    log "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p ./backups
    
    # Generate backup filename with timestamp
    backup_file="./backups/articles-backup-$(date +%Y%m%d-%H%M%S).db"
    
    # Check if database exists and create backup
    if [[ -f "./data/articles.db" ]]; then
        if [[ "$DRY_RUN" == "false" ]]; then
            cp "./data/articles.db" "$backup_file"
            log "Database backed up to: $backup_file"
        else
            info "Would backup database to: $backup_file"
        fi
    else
        info "No existing database found, skipping backup"
    fi
}

# Build containers
build_containers() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        info "Skipping container build"
        return
    fi
    
    log "Building containers..."
    
    if [[ "$DRY_RUN" == "false" ]]; then
        docker compose build
        log "Containers built successfully"
    else
        info "Would build containers"
    fi
}

# Deploy services
deploy_services() {
    log "Deploying $ENVIRONMENT environment..."
    
    local compose_cmd="docker compose"
    local compose_file=""
    
    # Set up compose command based on environment
    case $ENVIRONMENT in
        dev)
            compose_file="-f docker-compose.dev.yml"
            ;;
        production)
            compose_cmd="$compose_cmd --profile production"
            if [[ "$ANALYTICS" == "true" ]]; then
                compose_cmd="$compose_cmd --profile analytics"
            fi
            ;;
        staging)
            compose_cmd="$compose_cmd --profile staging"
            ;;
    esac
    
    if [[ "$DRY_RUN" == "false" ]]; then
        eval "$compose_cmd $compose_file up -d"
        log "$ENVIRONMENT environment deployed successfully"
    else
        info "Would run: $compose_cmd $compose_file up -d"
    fi
}

# Health checks
health_check() {
    if [[ "$SKIP_HEALTH" == "true" ]]; then
        info "Skipping health checks"
        return
    fi
    
    log "Performing health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if [[ "$DRY_RUN" == "false" ]]; then
            if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
                log "Health check passed (attempt $attempt/$max_attempts)"
                return 0
            fi
        else
            info "Would perform health check (attempt $attempt/$max_attempts)"
            return 0
        fi
        
        info "Health check failed, retrying in 5 seconds... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Show deployment status
show_status() {
    log "Deployment status:"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        docker compose ps
        
        log "Service URLs:"
        if [[ "$ENVIRONMENT" == "dev" ]]; then
            info "Website: http://localhost:3000"
            info "VSCode Browser: http://localhost:3000/vscode.html"
        else
            info "Website: http://localhost (or your configured domain)"
        fi
        
        if [[ "$ANALYTICS" == "true" ]]; then
            info "Analytics: http://localhost:3001"
        fi
        
        info "API: http://localhost:3000/api/v1"
        info "Health: http://localhost:3000/health"
    else
        info "Would show deployment status"
    fi
}

# Main deployment flow
main() {
    log "Starting InsightHub deployment..."
    log "Environment: $ENVIRONMENT"
    log "Analytics: $ANALYTICS"
    log "Dry run: $DRY_RUN"
    
    check_prerequisites
    backup_database
    build_containers
    deploy_services
    
    # Wait a moment for services to start
    if [[ "$DRY_RUN" == "false" ]]; then
        sleep 10
    fi
    
    health_check
    show_status
    
    log "Deployment completed successfully!"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Production deployment checklist:"
        info "□ Update DNS records to point to this server"
        info "□ Configure SSL certificates"
        info "□ Set up monitoring and alerting"
        info "□ Configure backup schedules"
        info "□ Review security settings"
    fi
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT

# Run main function
main "$@"
