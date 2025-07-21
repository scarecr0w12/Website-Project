const http = require('http');

/**
 * Enhanced health check for Docker containers
 * Checks multiple endpoints and service dependencies
 */

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Health check endpoints to test
const endpoints = [
  { path: '/health', name: 'Main Health' },
  { path: '/api/v1/health', name: 'API Health' },
  { path: '/api/v1/articles', name: 'Articles API' }
];

let checksPassed = 0;
let checksTotal = endpoints.length;

function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      host: HOST,
      port: PORT,
      path: endpoint.path,
      timeout: 3000,
      headers: {
        'User-Agent': 'Docker-HealthCheck'
      }
    };

    const request = http.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log(`✅ ${endpoint.name}: OK (${res.statusCode})`);
        resolve(true);
      } else {
        console.log(`❌ ${endpoint.name}: Failed (${res.statusCode})`);
        resolve(false);
      }
    });

    request.on('error', (error) => {
      console.log(`❌ ${endpoint.name}: Error - ${error.message}`);
      resolve(false);
    });

    request.on('timeout', () => {
      console.log(`❌ ${endpoint.name}: Timeout`);
      request.destroy();
      resolve(false);
    });

    request.setTimeout(3000);
    request.end();
  });
}

async function performHealthCheck() {
  console.log(`🔍 Health check started - ${new Date().toISOString()}`);
  console.log(`🎯 Target: ${HOST}:${PORT}`);
  
  // Check all endpoints
  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    if (result) checksPassed++;
  }
  
  // Determine overall health
  const healthPercentage = (checksPassed / checksTotal) * 100;
  
  console.log(`📊 Health check summary: ${checksPassed}/${checksTotal} checks passed (${healthPercentage.toFixed(1)}%)`);
  
  if (checksPassed === checksTotal) {
    console.log('✅ All health checks passed');
    process.exit(0);
  } else if (checksPassed > 0) {
    console.log('⚠️  Some health checks failed');
    process.exit(1);
  } else {
    console.log('❌ All health checks failed');
    process.exit(1);
  }
}

// Run health check
performHealthCheck().catch((error) => {
  console.error('❌ Health check error:', error.message);
  process.exit(1);
});
