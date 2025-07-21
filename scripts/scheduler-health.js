#!/usr/bin/env node

/**
 * Health check for the content scheduler service
 */

const http = require('http');

// Simple health check - if the process is running and responsive, it's healthy
const healthCheck = () => {
  try {
    // Check if we can access the scheduler module
    const scheduler = require('./scripts/content-scheduler');
    
    // Get health status
    const health = scheduler.getHealth ? scheduler.getHealth() : { status: 'unknown' };
    
    if (health.status === 'healthy') {
      console.log('Scheduler is healthy');
      process.exit(0);
    } else {
      console.log('Scheduler is not healthy:', health);
      process.exit(1);
    }
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
};

// Run health check
healthCheck();
