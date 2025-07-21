/**
 * Configuration manager for the viral content website
 * Handles environment variables and application settings
 */

require('dotenv').config();

class Config {
  constructor() {
    this.validateRequiredEnvVars();
  }

  /**
   * Validates that all required environment variables are set
   * @throws {Error} If required environment variables are missing
   */
  validateRequiredEnvVars() {
    const required = ['LLM_API_KEY', 'LLM_API_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  // Application Settings
  get app() {
    return {
      port: parseInt(process.env.PORT) || 3000,
      host: process.env.HOST || 'localhost',
      nodeEnv: process.env.NODE_ENV || 'development',
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production'
    };
  }

  // LLM API Configuration
  get llm() {
    return {
      apiUrl: process.env.LLM_API_URL,
      apiKey: process.env.LLM_API_KEY,
      model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 1500,
      temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
      timeout: parseInt(process.env.LLM_TIMEOUT) || 30000
    };
  }

  // Content Generation Settings
  get content() {
    return {
      generationEnabled: process.env.CONTENT_GENERATION_ENABLED === 'true',
      generationInterval: parseInt(process.env.CONTENT_GENERATION_INTERVAL) || 3600000, // 1 hour
      maxArticlesPerDay: parseInt(process.env.MAX_ARTICLES_PER_DAY) || 24,
      topics: process.env.CONTENT_TOPICS ? process.env.CONTENT_TOPICS.split(',').map(t => t.trim()) : ['technology', 'lifestyle'],
      rssFeeds: process.env.RSS_FEEDS ? process.env.RSS_FEEDS.split(',').map(f => f.trim()) : []
    };
  }

  // Database Configuration
  get database() {
    return {
      path: process.env.DATABASE_PATH || './data/articles.db'
    };
  }

  // Security Settings
  get security() {
    return {
      apiRateLimit: parseInt(process.env.API_RATE_LIMIT) || 100,
      corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : ['http://localhost:3000']
    };
  }

  // Analytics Settings
  get analytics() {
    return {
      enabled: process.env.ANALYTICS_ENABLED === 'true',
      performanceTracking: process.env.PERFORMANCE_TRACKING === 'true'
    };
  }
}

module.exports = new Config();
