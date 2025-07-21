/**
 * Database Layer for Viral Content Website
 * Handles SQLite database operations and article management
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
  constructor(dbPath = './data/articles.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });

      // Create database connection
      this.db = new sqlite3.Database(this.dbPath);
      
      // Create tables
      await this.createTables();
      
      console.log(`[Database] Connected to SQLite database: ${this.dbPath}`);
      return true;
    } catch (error) {
      console.error('[Database] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Create database tables if they don't exist
   */
  async createTables() {
    const createArticlesTable = `
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        html_content TEXT,
        content_type TEXT NOT NULL,
        topic TEXT,
        keywords TEXT,
        word_count INTEGER,
        reading_time INTEGER,
        performance_score REAL DEFAULT 0.0,
        views INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        engagement_rate REAL DEFAULT 0.0,
        seo_title TEXT,
        seo_description TEXT,
        og_title TEXT,
        og_description TEXT,
        status TEXT DEFAULT 'published',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createAnalyticsTable = `
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER,
        event_type TEXT NOT NULL,
        event_data TEXT,
        user_agent TEXT,
        ip_address TEXT,
        referrer TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles (id)
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)',
      'CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)',
      'CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_articles_performance ON articles(performance_score)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_article_id ON analytics(article_id)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type)'
    ];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createArticlesTable, (err) => {
          if (err) {
            console.error('[Database] Error creating articles table:', err.message);
            return reject(err);
          }
        });

        this.db.run(createAnalyticsTable, (err) => {
          if (err) {
            console.error('[Database] Error creating analytics table:', err.message);
            return reject(err);
          }
        });

        // Create indexes
        createIndexes.forEach(indexQuery => {
          this.db.run(indexQuery, (err) => {
            if (err) console.error('[Database] Index creation warning:', err.message);
          });
        });

        console.log('[Database] Tables and indexes created successfully');
        resolve();
      });
    });
  }

  /**
   * Save a new article to the database
   * @param {Object} article - Article data from content generator
   * @returns {Promise<Object>} Saved article with ID
   */
  async saveArticle(article) {
    const query = `
      INSERT INTO articles (
        title, slug, excerpt, content, html_content, content_type, topic,
        keywords, word_count, reading_time, seo_title, seo_description,
        og_title, og_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      article.title,
      article.slug,
      article.excerpt,
      article.content,
      article.htmlContent,
      article.metadata?.contentType || 'article',
      article.metadata?.topic || null,
      JSON.stringify(article.seoData?.keywords || []),
      article.wordCount,
      article.readingTime,
      article.seoData?.title || article.title,
      article.seoData?.description || article.excerpt,
      article.seoData?.ogTitle || article.title,
      article.seoData?.ogDescription || article.excerpt
    ];

    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('[Database] Error saving article:', err.message);
          return reject(err);
        }
        
        console.log(`[Database] Article saved with ID: ${this.lastID}`);
        resolve({
          id: this.lastID,
          ...article
        });
      });
    });
  }

  /**
   * Get article by slug
   * @param {string} slug - Article slug
   * @returns {Promise<Object|null>} Article or null
   */
  async getArticleBySlug(slug) {
    const query = 'SELECT * FROM articles WHERE slug = ? AND status = "published"';
    
    return new Promise((resolve, reject) => {
      this.db.get(query, [slug], (err, row) => {
        if (err) {
          console.error('[Database] Error fetching article by slug:', err.message);
          return reject(err);
        }
        
        if (row) {
          row.keywords = JSON.parse(row.keywords || '[]');
        }
        
        resolve(row || null);
      });
    });
  }

  /**
   * Get articles with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Articles and pagination info
   */
  async getArticles(options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      contentType = null,
      topic = null
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['status = "published"'];
    let params = [];

    if (contentType) {
      whereConditions.push('content_type = ?');
      params.push(contentType);
    }

    if (topic) {
      whereConditions.push('topic = ?');
      params.push(topic);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT * FROM articles 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM articles ${whereClause}
    `;

    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          console.error('[Database] Error fetching articles:', err.message);
          return reject(err);
        }

        // Parse keywords for each article
        rows.forEach(row => {
          row.keywords = JSON.parse(row.keywords || '[]');
        });

        // Get total count
        this.db.get(countQuery, params.slice(0, -2), (err, countResult) => {
          if (err) {
            console.error('[Database] Error counting articles:', err.message);
            return reject(err);
          }

          const total = countResult.total;
          const totalPages = Math.ceil(total / limit);

          resolve({
            articles: rows,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1
            }
          });
        });
      });
    });
  }

  /**
   * Track article analytics
   * @param {number} articleId - Article ID
   * @param {string} eventType - Event type (view, share, etc.)
   * @param {Object} eventData - Additional event data
   * @param {Object} metadata - Request metadata
   */
  async trackEvent(articleId, eventType, eventData = {}, metadata = {}) {
    const query = `
      INSERT INTO analytics (article_id, event_type, event_data, user_agent, ip_address, referrer)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      articleId,
      eventType,
      JSON.stringify(eventData),
      metadata.userAgent || null,
      metadata.ipAddress || null,
      metadata.referrer || null
    ];

    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          console.error('[Database] Error tracking event:', err.message);
          return reject(err);
        }
        resolve(this.lastID);
      });
    });
  }

  /**
   * Update article performance metrics
   * @param {number} articleId - Article ID
   */
  async updateArticleMetrics(articleId) {
    const metricsQuery = `
      SELECT 
        COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares
      FROM analytics 
      WHERE article_id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.get(metricsQuery, [articleId], (err, metrics) => {
        if (err) {
          console.error('[Database] Error fetching metrics:', err.message);
          return reject(err);
        }

        const engagementRate = metrics.views > 0 ? (metrics.shares / metrics.views) * 100 : 0;
        const performanceScore = metrics.views * 1 + metrics.shares * 10 + engagementRate * 5;

        const updateQuery = `
          UPDATE articles 
          SET views = ?, shares = ?, engagement_rate = ?, performance_score = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        this.db.run(updateQuery, [metrics.views, metrics.shares, engagementRate, performanceScore, articleId], function(err) {
          if (err) {
            console.error('[Database] Error updating metrics:', err.message);
            return reject(err);
          }
          resolve({ views: metrics.views, shares: metrics.shares, engagementRate, performanceScore });
        });
      });
    });
  }

  /**
   * Get top performing articles
   * @param {number} limit - Number of articles to return
   * @returns {Promise<Array>} Top articles
   */
  async getTopArticles(limit = 10) {
    const query = `
      SELECT * FROM articles 
      WHERE status = "published"
      ORDER BY performance_score DESC, views DESC
      LIMIT ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          console.error('[Database] Error fetching top articles:', err.message);
          return reject(err);
        }

        rows.forEach(row => {
          row.keywords = JSON.parse(row.keywords || '[]');
        });

        resolve(rows);
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            console.error('[Database] Error closing database:', err.message);
            reject(err);
          } else {
            console.log('[Database] Database connection closed');
            resolve();
          }
        });
      });
    }
  }

  /**
   * Database adapter methods for admin system
   * These methods provide a Promise-based interface for admin operations
   */
  
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    return this.run(sql, values);
  }
}

module.exports = Database;
