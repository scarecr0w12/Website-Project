# =============================================================================
# System-Agnostic Viral Content Website Makefile
# Cross-platform development and deployment automation
# =============================================================================

# Project configuration
PROJECT_NAME := viral-content
VERSION ?= latest
NODE_ENV ?= development
COMPOSE_FILE ?= docker-compose.yml
COMPOSE_DEV_FILE ?= docker-compose.dev.yml

# Platform detection
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

# Docker configuration
DOCKER_PLATFORM ?= linux/amd64,linux/arm64
DOCKER_BUILDKIT ?= 1
COMPOSE_DOCKER_CLI_BUILD ?= 1

# Color codes for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
NC := \033[0m # No Color

# =============================================================================
# Help and Information
# =============================================================================

.PHONY: help
help: ## Show this help message
	@echo "$(CYAN)System-Agnostic Viral Content Website$(NC)"
	@echo "$(CYAN)======================================$(NC)"
	@echo ""
	@echo "$(GREEN)Platform Information:$(NC)"
	@echo "  OS: $(UNAME_S)"
	@echo "  Architecture: $(UNAME_M)"
	@echo "  Docker Platform: $(DOCKER_PLATFORM)"
	@echo ""
	@echo "$(GREEN)Available Commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  $(YELLOW)make setup$(NC)     - Initial project setup"
	@echo "  $(YELLOW)make dev$(NC)       - Start development environment"
	@echo "  $(YELLOW)make build$(NC)     - Build production containers"
	@echo "  $(YELLOW)make deploy$(NC)    - Deploy to production"

.PHONY: info
info: ## Show system and project information
	@echo "$(BLUE)System Information:$(NC)"
	@echo "  Operating System: $(UNAME_S)"
	@echo "  Architecture: $(UNAME_M)"
	@echo "  Project: $(PROJECT_NAME)"
	@echo "  Version: $(VERSION)"
	@echo "  Environment: $(NODE_ENV)"
	@echo "  Docker Buildkit: $(DOCKER_BUILDKIT)"
	@echo ""
	@echo "$(BLUE)Docker Information:$(NC)"
	@docker version --format "  Docker Engine: {{.Server.Version}}"
	@docker compose version --format "  Compose: {{.Version}}"
	@echo ""
	@echo "$(BLUE)Available Compose Files:$(NC)"
	@test -f $(COMPOSE_FILE) && echo "  ✓ $(COMPOSE_FILE) (production)" || echo "  ✗ $(COMPOSE_FILE) (missing)"
	@test -f $(COMPOSE_DEV_FILE) && echo "  ✓ $(COMPOSE_DEV_FILE) (development)" || echo "  ✗ $(COMPOSE_DEV_FILE) (missing)"

# =============================================================================
# Setup and Installation
# =============================================================================

.PHONY: setup
setup: ## Initial project setup for any platform
	@echo "$(GREEN)Setting up Viral Content Website...$(NC)"
	@echo "$(YELLOW)Checking prerequisites...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)Docker is required but not installed.$(NC)"; exit 1; }
	@command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 || { echo "$(RED)Docker Compose v2 is required.$(NC)"; exit 1; }
	@echo "$(GREEN)✓ Docker and Docker Compose are available$(NC)"
	
	@echo "$(YELLOW)Creating necessary directories...$(NC)"
	@mkdir -p data generated-content logs backups/analytics nginx
	@echo "$(GREEN)✓ Directories created$(NC)"
	
	@echo "$(YELLOW)Setting up environment configuration...$(NC)"
	@test -f .env || cp .env.example .env
	@echo "$(GREEN)✓ Environment file ready$(NC)"
	
	@echo "$(YELLOW)Setting up Docker networks...$(NC)"
	@docker network create viral-content-network 2>/dev/null || true
	@docker network create analytics-network 2>/dev/null || true
	@echo "$(GREEN)✓ Networks configured$(NC)"
	
	@echo "$(GREEN)Setup complete! Run 'make dev' to start development.$(NC)"

.PHONY: install
install: setup ## Alias for setup

# =============================================================================
# Development Commands
# =============================================================================

.PHONY: dev
dev: ## Start development environment with hot reload
	@echo "$(GREEN)Starting development environment...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	export COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) && \
	docker compose -f $(COMPOSE_DEV_FILE) up --build

.PHONY: dev-detached
dev-detached: ## Start development environment in background
	@echo "$(GREEN)Starting development environment in background...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	export COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) && \
	docker compose -f $(COMPOSE_DEV_FILE) up --build -d

.PHONY: dev-v2
dev-v2: ## Start development with Docker Compose v2 features
	@echo "$(GREEN)Starting development with Docker Compose v2...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	export COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) && \
	NODE_ENV=development docker compose -f $(COMPOSE_DEV_FILE) up --build

.PHONY: tools
tools: ## Start development tools container
	@echo "$(GREEN)Starting development tools...$(NC)"
	@docker compose -f $(COMPOSE_DEV_FILE) --profile tools up -d
	@echo "$(YELLOW)Tools container started. Access with:$(NC)"
	@echo "  docker compose -f $(COMPOSE_DEV_FILE) exec tools /bin/sh"

# =============================================================================
# Building and Testing
# =============================================================================

.PHONY: build
build: ## Build production containers for multiple architectures
	@echo "$(GREEN)Building multi-architecture containers...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		--build-arg NODE_ENV=production \
		--build-arg VERSION=$(VERSION) \
		--build-arg BUILD_DATE=$(shell date -u +'%Y-%m-%dT%H:%M:%SZ') \
		--build-arg VCS_REF=$(shell git rev-parse HEAD 2>/dev/null || echo "unknown") \
		--target production \
		--tag $(PROJECT_NAME)-web:$(VERSION) \
		--tag $(PROJECT_NAME)-web:latest \
		--load \
		.

.PHONY: build-dev
build-dev: ## Build development containers
	@echo "$(GREEN)Building development containers...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		--build-arg NODE_ENV=development \
		--build-arg VERSION=$(VERSION) \
		--file Dockerfile.dev \
		--target development \
		--tag $(PROJECT_NAME)-web-dev:$(VERSION) \
		--tag $(PROJECT_NAME)-web-dev:latest \
		--load \
		.

.PHONY: test
test: ## Run all tests in containerized environment
	@echo "$(GREEN)Running tests...$(NC)"
	@docker compose -f $(COMPOSE_DEV_FILE) --profile tools run --rm tools npm test

.PHONY: lint
lint: ## Run code linting
	@echo "$(GREEN)Running linter...$(NC)"
	@docker compose -f $(COMPOSE_DEV_FILE) --profile tools run --rm tools npm run lint 2>/dev/null || \
	docker compose -f $(COMPOSE_DEV_FILE) --profile tools run --rm tools npx eslint . || \
	echo "$(YELLOW)Linting tools not configured$(NC)"

.PHONY: format
format: ## Format code
	@echo "$(GREEN)Formatting code...$(NC)"
	@docker compose -f $(COMPOSE_DEV_FILE) --profile tools run --rm tools npm run format 2>/dev/null || \
	docker compose -f $(COMPOSE_DEV_FILE) --profile tools run --rm tools npx prettier --write . || \
	echo "$(YELLOW)Code formatting tools not configured$(NC)"

# =============================================================================
# Production Deployment
# =============================================================================

.PHONY: deploy
deploy: ## Deploy to production using Docker Compose
	@echo "$(GREEN)Deploying to production...$(NC)"
	@echo "$(YELLOW)Using system-agnostic configuration...$(NC)"
	@test -f $(COMPOSE_FILE) || { echo "$(RED)$(COMPOSE_FILE) not found$(NC)"; exit 1; }
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	export COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) && \
	NODE_ENV=production docker compose -f $(COMPOSE_FILE) --profile production up --build -d

.PHONY: deploy-nginx
deploy-nginx: ## Deploy with Nginx reverse proxy
	@echo "$(GREEN)Deploying with Nginx proxy...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	export COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) && \
	NODE_ENV=production docker compose -f $(COMPOSE_FILE) --profile nginx --profile production up --build -d

.PHONY: deploy-analytics
deploy-analytics: ## Deploy with analytics services
	@echo "$(GREEN)Deploying with analytics...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	export COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) && \
	NODE_ENV=production docker compose -f $(COMPOSE_FILE) --profile analytics --profile production up --build -d

.PHONY: deploy-full
deploy-full: ## Deploy full stack with all services
	@echo "$(GREEN)Deploying full stack...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	export COMPOSE_DOCKER_CLI_BUILD=$(COMPOSE_DOCKER_CLI_BUILD) && \
	NODE_ENV=production docker compose -f $(COMPOSE_FILE) --profile production --profile nginx --profile analytics --profile backup up --build -d

# =============================================================================
# Service Management
# =============================================================================

.PHONY: start
start: ## Start all services
	@echo "$(GREEN)Starting services...$(NC)"
	@docker compose -f $(COMPOSE_FILE) start

.PHONY: stop
stop: ## Stop all services
	@echo "$(YELLOW)Stopping services...$(NC)"
	@docker compose -f $(COMPOSE_FILE) stop
	@docker compose -f $(COMPOSE_DEV_FILE) stop 2>/dev/null || true

.PHONY: restart
restart: stop start ## Restart all services

.PHONY: status
status: ## Show service status
	@echo "$(BLUE)Service Status:$(NC)"
	@docker compose -f $(COMPOSE_FILE) ps 2>/dev/null || echo "Production services not running"
	@echo ""
	@docker compose -f $(COMPOSE_DEV_FILE) ps 2>/dev/null || echo "Development services not running"

# =============================================================================
# Logs and Monitoring
# =============================================================================

.PHONY: logs
logs: ## Show logs from all services
	@docker compose -f $(COMPOSE_FILE) logs -f 2>/dev/null || \
	docker compose -f $(COMPOSE_DEV_FILE) logs -f 2>/dev/null || \
	echo "$(RED)No services running$(NC)"

.PHONY: logs-web
logs-web: ## Show web service logs
	@docker compose -f $(COMPOSE_FILE) logs -f web 2>/dev/null || \
	docker compose -f $(COMPOSE_DEV_FILE) logs -f web 2>/dev/null || \
	echo "$(RED)Web service not running$(NC)"

.PHONY: logs-scheduler
logs-scheduler: ## Show content scheduler logs
	@docker compose -f $(COMPOSE_FILE) logs -f content-scheduler 2>/dev/null || \
	echo "$(RED)Scheduler service not running$(NC)"

.PHONY: health
health: ## Check health of all services
	@echo "$(BLUE)Service Health Status:$(NC)"
	@docker compose -f $(COMPOSE_FILE) ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
	docker compose -f $(COMPOSE_DEV_FILE) ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || \
	echo "$(RED)No services running$(NC)"

# =============================================================================
# Database and Content Management
# =============================================================================

.PHONY: backup
backup: ## Create backup of data and content
	@echo "$(GREEN)Creating backup...$(NC)"
	@docker compose -f $(COMPOSE_FILE) --profile backup run --rm backup || \
	./scripts/backup.sh || \
	echo "$(YELLOW)Manual backup required - check ./backups directory$(NC)"

.PHONY: restore
restore: ## Restore from backup (requires BACKUP_FILE environment variable)
	@test -n "$(BACKUP_FILE)" || { echo "$(RED)BACKUP_FILE environment variable required$(NC)"; exit 1; }
	@echo "$(GREEN)Restoring from $(BACKUP_FILE)...$(NC)"
	@echo "$(RED)WARNING: This will overwrite current data$(NC)"
	@read -p "Continue? (y/N) " -n 1 -r; echo; [[ $$REPLY =~ ^[Yy]$$ ]] || exit 1
	@./scripts/restore.sh "$(BACKUP_FILE)" || echo "$(RED)Restore failed$(NC)"

.PHONY: generate-content
generate-content: ## Generate new content
	@echo "$(GREEN)Generating new content...$(NC)"
	@docker compose -f $(COMPOSE_DEV_FILE) --profile tools run --rm tools node scripts/generate-content.js

.PHONY: db-shell
db-shell: ## Access database shell
	@echo "$(GREEN)Opening database shell...$(NC)"
	@docker compose -f $(COMPOSE_DEV_FILE) --profile database up -d
	@echo "$(YELLOW)Database browser available at http://localhost:8080$(NC)"
	@echo "$(YELLOW)Use SQLite and path: /data/articles.db$(NC)"

# =============================================================================
# Cleanup Commands
# =============================================================================

.PHONY: clean
clean: ## Clean up containers and volumes
	@echo "$(YELLOW)Cleaning up containers...$(NC)"
	@docker compose -f $(COMPOSE_FILE) down --remove-orphans 2>/dev/null || true
	@docker compose -f $(COMPOSE_DEV_FILE) down --remove-orphans 2>/dev/null || true
	@docker system prune -f

.PHONY: clean-all
clean-all: ## Clean up everything including volumes and images
	@echo "$(RED)WARNING: This will remove all containers, volumes, and images$(NC)"
	@read -p "Continue? (y/N) " -n 1 -r; echo; [[ $$REPLY =~ ^[Yy]$$ ]] || exit 1
	@docker compose -f $(COMPOSE_FILE) down --volumes --remove-orphans 2>/dev/null || true
	@docker compose -f $(COMPOSE_DEV_FILE) down --volumes --remove-orphans 2>/dev/null || true
	@docker system prune -af --volumes

.PHONY: reset
reset: clean-all setup ## Reset project to initial state

# =============================================================================
# Utility Commands
# =============================================================================

.PHONY: shell
shell: ## Access main container shell
	@docker compose -f $(COMPOSE_DEV_FILE) exec web /bin/sh || \
	docker compose -f $(COMPOSE_FILE) exec web /bin/sh || \
	echo "$(RED)No running containers found$(NC)"

.PHONY: shell-root
shell-root: ## Access main container shell as root
	@docker compose -f $(COMPOSE_DEV_FILE) exec --user root web /bin/sh || \
	docker compose -f $(COMPOSE_FILE) exec --user root web /bin/sh || \
	echo "$(RED)No running containers found$(NC)"

.PHONY: update
update: ## Update containers and dependencies
	@echo "$(GREEN)Updating containers and dependencies...$(NC)"
	@docker compose -f $(COMPOSE_FILE) pull 2>/dev/null || true
	@docker compose -f $(COMPOSE_DEV_FILE) pull 2>/dev/null || true
	@echo "$(GREEN)Update complete. Run 'make restart' to apply changes.$(NC)"

.PHONY: security-scan
security-scan: ## Run security scan on containers
	@echo "$(GREEN)Running security scan...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)Docker required for security scan$(NC)"; exit 1; }
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy:latest image $(PROJECT_NAME)-web:latest 2>/dev/null || \
		echo "$(YELLOW)Install Trivy for security scanning$(NC)"

# =============================================================================
# CI/CD Integration
# =============================================================================

.PHONY: ci-build
ci-build: ## CI/CD build command
	@echo "$(GREEN)CI/CD Build Process$(NC)"
	@export DOCKER_BUILDKIT=1 && \
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		--build-arg NODE_ENV=production \
		--build-arg VERSION=$(VERSION) \
		--build-arg BUILD_DATE=$(shell date -u +'%Y-%m-%dT%H:%M:%SZ') \
		--build-arg VCS_REF=$(shell git rev-parse HEAD) \
		--target production \
		--tag $(PROJECT_NAME)-web:$(VERSION) \
		.

.PHONY: ci-test
ci-test: ## CI/CD test command
	@echo "$(GREEN)CI/CD Test Process$(NC)"
	@docker compose -f $(COMPOSE_DEV_FILE) --profile tools run --rm tools npm test

.PHONY: ci-security
ci-security: ## CI/CD security scan
	@echo "$(GREEN)CI/CD Security Scan$(NC)"
	@make security-scan

# Default target
.DEFAULT_GOAL := help

# Export environment variables for sub-processes
export DOCKER_BUILDKIT
export COMPOSE_DOCKER_CLI_BUILD
