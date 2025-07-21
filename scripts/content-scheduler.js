#!/usr/bin/env node

/**
 * Automated Content Generation Scheduler
 * Runs as a separate service to generate content on a schedule
 */

const ContentManager = require('./content-manager');
const cron = require('cron');

class ContentScheduler {
  constructor() {
    this.contentManager = new ContentManager();
    this.isGenerating = false;
    this.stats = {
      totalGenerated: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      lastRun: null,
      nextRun: null
    };
    
    // Configuration from environment
    this.config = {
      enabled: process.env.CONTENT_GENERATION_ENABLED === 'true',
      maxArticlesPerDay: parseInt(process.env.MAX_ARTICLES_PER_DAY) || 24,
      interval: parseInt(process.env.CONTENT_GENERATION_INTERVAL) || 3600000, // 1 hour default
      batchSize: parseInt(process.env.GENERATION_BATCH_SIZE) || 1,
      retryAttempts: parseInt(process.env.GENERATION_RETRY_ATTEMPTS) || 3
    };

    console.log('[Scheduler] Content generation scheduler initialized');
    console.log('[Scheduler] Configuration:', this.config);
  }

  /**
   * Start the scheduler
   */
  start() {
    if (!this.config.enabled) {
      console.log('[Scheduler] Content generation is disabled via configuration');
      return;
    }

    // Convert interval to cron format (run every X minutes)
    const intervalMinutes = Math.floor(this.config.interval / 60000);
    const cronPattern = `*/${intervalMinutes} * * * *`;
    
    console.log(`[Scheduler] Starting scheduler with pattern: ${cronPattern}`);
    console.log(`[Scheduler] Will generate ${this.config.batchSize} article(s) every ${intervalMinutes} minutes`);

    // Create cron job
    this.cronJob = new cron.CronJob(cronPattern, async () => {
      await this.runGeneration();
    }, null, true, 'UTC');

    // Also run once at startup (after a delay)
    setTimeout(() => {
      this.runGeneration();
    }, 30000); // Wait 30 seconds for the web service to be ready

    console.log('[Scheduler] Scheduler started successfully');
    this.logNextRun();
  }

  /**
   * Run content generation
   */
  async runGeneration() {
    if (this.isGenerating) {
      console.log('[Scheduler] Generation already in progress, skipping...');
      return;
    }

    try {
      this.isGenerating = true;
      this.stats.lastRun = new Date();
      
      console.log(`[Scheduler] Starting content generation batch at ${this.stats.lastRun.toISOString()}`);

      // Check daily limit
      const todayGenerated = await this.getTodayGenerationCount();
      if (todayGenerated >= this.config.maxArticlesPerDay) {
        console.log(`[Scheduler] Daily limit reached (${todayGenerated}/${this.config.maxArticlesPerDay}), skipping generation`);
        return;
      }

      const remaining = this.config.maxArticlesPerDay - todayGenerated;
      const toGenerate = Math.min(this.config.batchSize, remaining);

      console.log(`[Scheduler] Generating ${toGenerate} article(s) (${todayGenerated}/${this.config.maxArticlesPerDay} daily limit)`);

      // Generate articles
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < toGenerate; i++) {
        try {
          await this.generateSingleArticleWithRetry();
          successCount++;
          this.stats.successfulGenerations++;
          
          // Small delay between generations
          if (i < toGenerate - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (error) {
          console.error(`[Scheduler] Failed to generate article ${i + 1}:`, error.message);
          failCount++;
          this.stats.failedGenerations++;
        }
      }

      this.stats.totalGenerated += successCount;
      
      console.log(`[Scheduler] Batch complete: ${successCount} successful, ${failCount} failed`);
      this.logStats();

    } catch (error) {
      console.error('[Scheduler] Error during generation batch:', error.message);
      this.stats.failedGenerations++;
    } finally {
      this.isGenerating = false;
      this.logNextRun();
    }
  }

  /**
   * Generate a single article with retry logic
   */
  async generateSingleArticleWithRetry() {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.contentManager.generateAndSave('single');
        return; // Success
      } catch (error) {
        lastError = error;
        console.error(`[Scheduler] Attempt ${attempt}/${this.config.retryAttempts} failed:`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          const delay = attempt * 10000; // Exponential backoff
          console.log(`[Scheduler] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get count of articles generated today
   */
  async getTodayGenerationCount() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await this.contentManager.apiClient.get(`/articles?limit=1000&sortBy=created_at&sortOrder=DESC`);
      
      if (response.data.success) {
        const todayArticles = response.data.data.filter(article => {
          const articleDate = new Date(article.created_at).toISOString().split('T')[0];
          return articleDate === today;
        });
        
        return todayArticles.length;
      }
      
      return 0;
    } catch (error) {
      console.error('[Scheduler] Error getting today\'s generation count:', error.message);
      return 0;
    }
  }

  /**
   * Log statistics
   */
  logStats() {
    console.log(`[Scheduler] Stats: Total: ${this.stats.totalGenerated}, Success: ${this.stats.successfulGenerations}, Failed: ${this.stats.failedGenerations}`);
  }

  /**
   * Log next run time
   */
  logNextRun() {
    if (this.cronJob) {
      const nextRun = this.cronJob.nextDates();
      this.stats.nextRun = nextRun;
      console.log(`[Scheduler] Next generation scheduled for: ${nextRun.toISOString()}`);
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('[Scheduler] Scheduler stopped');
    }
  }

  /**
   * Health check
   */
  getHealth() {
    return {
      status: 'healthy',
      enabled: this.config.enabled,
      isGenerating: this.isGenerating,
      stats: this.stats,
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize and start scheduler
const scheduler = new ContentScheduler();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Scheduler] SIGTERM received, shutting down gracefully');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Scheduler] SIGINT received, shutting down gracefully');
  scheduler.stop();
  process.exit(0);
});

// Start the scheduler
scheduler.start();

// Keep the process alive
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Scheduler] Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('[Scheduler] Content generation scheduler is running...');

module.exports = scheduler;
