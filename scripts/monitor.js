#!/usr/bin/env node

/**
 * InsightHub Monitoring and Alerting System
 * Monitors system health, performance, and sends alerts
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class SystemMonitor {
    constructor() {
        this.config = {
            checkInterval: 60000, // 1 minute
            alertThresholds: {
                responseTime: 5000,    // 5 seconds
                errorRate: 0.1,        // 10%
                diskUsage: 0.85,       // 85%
                memoryUsage: 0.90      // 90%
            },
            endpoints: [
                { url: 'http://localhost:3000/health', name: 'Main App' },
                { url: 'http://localhost:3000/api/v1/health', name: 'API' },
                { url: 'http://localhost:3000/api/v1/articles', name: 'Articles' }
            ],
            logFile: './logs/monitor.log',
            alertsEnabled: process.env.ALERTS_ENABLED !== 'false'
        };
        
        this.metrics = {
            uptime: process.uptime(),
            checks: 0,
            failures: 0,
            responseTime: [],
            lastCheck: null,
            status: 'unknown'
        };
        
        this.initialize();
    }
    
    async initialize() {
        // Ensure logs directory exists
        try {
            await fs.mkdir('./logs', { recursive: true });
        } catch (error) {
            // Directory already exists
        }
        
        console.log('🔍 InsightHub System Monitor started');
        console.log(`📊 Check interval: ${this.config.checkInterval / 1000}s`);
        console.log(`🚨 Alerts enabled: ${this.config.alertsEnabled}`);
        
        this.startMonitoring();
    }
    
    async log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            metrics: this.metrics
        };
        
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
        
        try {
            await fs.appendFile(
                this.config.logFile,
                JSON.stringify(logEntry) + '\n'
            );
        } catch (error) {
            console.error('Failed to write log:', error.message);
        }
    }
    
    async checkEndpoint(endpoint) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const request = http.get(endpoint.url, { timeout: 10000 }, (response) => {
                const responseTime = Date.now() - startTime;
                const success = response.statusCode >= 200 && response.statusCode < 400;
                
                resolve({
                    name: endpoint.name,
                    url: endpoint.url,
                    success,
                    statusCode: response.statusCode,
                    responseTime,
                    timestamp: new Date().toISOString()
                });
            });
            
            request.on('error', (error) => {
                const responseTime = Date.now() - startTime;
                resolve({
                    name: endpoint.name,
                    url: endpoint.url,
                    success: false,
                    error: error.message,
                    responseTime,
                    timestamp: new Date().toISOString()
                });
            });
            
            request.on('timeout', () => {
                request.destroy();
                const responseTime = Date.now() - startTime;
                resolve({
                    name: endpoint.name,
                    url: endpoint.url,
                    success: false,
                    error: 'Timeout',
                    responseTime,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }
    
    async performHealthCheck() {
        this.metrics.checks++;
        this.metrics.lastCheck = new Date().toISOString();
        
        const results = [];
        let failureCount = 0;
        let totalResponseTime = 0;
        
        // Check all endpoints
        for (const endpoint of this.config.endpoints) {
            const result = await this.checkEndpoint(endpoint);
            results.push(result);
            
            if (!result.success) {
                failureCount++;
            }
            
            totalResponseTime += result.responseTime;
        }
        
        // Update metrics
        const avgResponseTime = totalResponseTime / this.config.endpoints.length;
        this.metrics.responseTime.push(avgResponseTime);
        
        // Keep only last 100 response times
        if (this.metrics.responseTime.length > 100) {
            this.metrics.responseTime = this.metrics.responseTime.slice(-100);
        }
        
        const errorRate = failureCount / this.config.endpoints.length;
        this.metrics.failures += failureCount;
        
        // Determine overall status
        let status = 'healthy';
        if (errorRate > 0.5) {
            status = 'unhealthy';
        } else if (errorRate > 0) {
            status = 'degraded';
        }
        
        this.metrics.status = status;
        
        // Log results
        if (failureCount > 0) {
            await this.log('warn', `Health check completed with ${failureCount} failures`, {
                errorRate,
                avgResponseTime,
                results
            });
        } else {
            await this.log('info', 'Health check completed successfully', {
                avgResponseTime,
                results: results.length
            });
        }
        
        // Check for alerts
        await this.checkAlerts(errorRate, avgResponseTime, results);
        
        return { status, errorRate, avgResponseTime, results };
    }
    
    async checkAlerts(errorRate, avgResponseTime, results) {
        if (!this.config.alertsEnabled) return;
        
        const alerts = [];
        
        // High error rate
        if (errorRate > this.config.alertThresholds.errorRate) {
            alerts.push({
                type: 'HIGH_ERROR_RATE',
                severity: 'critical',
                message: `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${(this.config.alertThresholds.errorRate * 100)}%`
            });
        }
        
        // High response time
        if (avgResponseTime > this.config.alertThresholds.responseTime) {
            alerts.push({
                type: 'HIGH_RESPONSE_TIME',
                severity: 'warning',
                message: `Average response time ${avgResponseTime}ms exceeds threshold ${this.config.alertThresholds.responseTime}ms`
            });
        }
        
        // Service failures
        const failedServices = results.filter(r => !r.success);
        if (failedServices.length > 0) {
            alerts.push({
                type: 'SERVICE_FAILURE',
                severity: failedServices.length === results.length ? 'critical' : 'warning',
                message: `${failedServices.length} service(s) failing: ${failedServices.map(s => s.name).join(', ')}`
            });
        }
        
        // Send alerts
        for (const alert of alerts) {
            await this.sendAlert(alert);
        }
    }
    
    async sendAlert(alert) {
        await this.log('alert', alert.message, alert);
        
        // In a real implementation, you would send to:
        // - Email via SMTP
        // - Slack webhook
        // - Discord webhook
        // - SMS service
        // - PagerDuty
        
        console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    }
    
    async getSystemMetrics() {
        try {
            // Get memory usage
            const memUsage = process.memoryUsage();
            const memPercent = memUsage.heapUsed / memUsage.heapTotal;
            
            // Calculate average response time
            const avgResponseTime = this.metrics.responseTime.length > 0 
                ? this.metrics.responseTime.reduce((a, b) => a + b) / this.metrics.responseTime.length 
                : 0;
            
            // Calculate error rate
            const errorRate = this.metrics.checks > 0 ? this.metrics.failures / (this.metrics.checks * this.config.endpoints.length) : 0;
            
            return {
                uptime: process.uptime(),
                memory: {
                    used: memUsage.heapUsed,
                    total: memUsage.heapTotal,
                    percent: memPercent
                },
                checks: this.metrics.checks,
                failures: this.metrics.failures,
                errorRate,
                avgResponseTime,
                status: this.metrics.status,
                lastCheck: this.metrics.lastCheck
            };
        } catch (error) {
            await this.log('error', 'Failed to get system metrics', { error: error.message });
            return null;
        }
    }
    
    startMonitoring() {
        // Initial check
        this.performHealthCheck();
        
        // Schedule periodic checks
        setInterval(() => {
            this.performHealthCheck();
        }, this.config.checkInterval);
        
        // Status report every 10 minutes
        setInterval(async () => {
            const metrics = await this.getSystemMetrics();
            await this.log('info', 'System status report', metrics);
        }, 600000);
        
        // Handle process signals
        process.on('SIGTERM', () => {
            this.log('info', 'Monitor shutting down (SIGTERM)');
            process.exit(0);
        });
        
        process.on('SIGINT', () => {
            this.log('info', 'Monitor shutting down (SIGINT)');
            process.exit(0);
        });
    }
}

// Start monitor if run directly
if (require.main === module) {
    const monitor = new SystemMonitor();
}

module.exports = SystemMonitor;
