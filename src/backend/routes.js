/**
 * API Routes for Viral Content Website
 * Handles REST API endpoints for content management and serving
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Database = require('./database');

const router = express.Router();

/**
 * Middleware for validation error handling
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Middleware to ensure database connection
 */
const ensureDatabase = async (req, res, next) => {
  if (!req.app.locals.db) {
    return res.status(503).json({
      success: false,
      message: 'Database not available'
    });
  }
  next();
};

/**
 * GET /api/v1/articles
 * Get articles with pagination and filtering
 */
router.get('/articles', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('contentType').optional().isString().withMessage('Content type must be a string'),
  query('topic').optional().isString().withMessage('Topic must be a string'),
  query('sortBy').optional().isIn(['created_at', 'performance_score', 'views', 'title']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC'),
  handleValidationErrors,
  ensureDatabase
], async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      contentType: req.query.contentType,
      topic: req.query.topic,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await req.app.locals.db.getArticles(options);

    res.json({
      success: true,
      data: result.articles,
      pagination: result.pagination,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API] Error fetching articles:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/articles/:slug
 * Get single article by slug and track view
 */
router.get('/articles/:slug', [
  param('slug').isString().isLength({ min: 1 }).withMessage('Slug is required'),
  handleValidationErrors,
  ensureDatabase
], async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await req.app.locals.db.getArticleBySlug(slug);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Track view event
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referrer')
    };

    await req.app.locals.db.trackEvent(article.id, 'view', {}, metadata);
    
    // Update metrics asynchronously
    req.app.locals.db.updateArticleMetrics(article.id).catch(err => {
      console.error('[API] Error updating metrics:', err.message);
    });

    res.json({
      success: true,
      data: article,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API] Error fetching article:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/articles/:slug/share
 * Track article share event
 */
router.post('/articles/:slug/share', [
  param('slug').isString().isLength({ min: 1 }).withMessage('Slug is required'),
  body('platform').optional().isString().withMessage('Platform must be a string'),
  body('url').optional().isURL().withMessage('URL must be valid'),
  handleValidationErrors,
  ensureDatabase
], async (req, res) => {
  try {
    const { slug } = req.params;
    const { platform, url } = req.body;

    const article = await req.app.locals.db.getArticleBySlug(slug);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Track share event
    const eventData = { platform, url };
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      referrer: req.get('Referrer')
    };

    await req.app.locals.db.trackEvent(article.id, 'share', eventData, metadata);
    
    // Update metrics asynchronously
    req.app.locals.db.updateArticleMetrics(article.id).catch(err => {
      console.error('[API] Error updating metrics:', err.message);
    });

    res.json({
      success: true,
      message: 'Share tracked successfully',
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API] Error tracking share:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to track share',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/articles (Internal API)
 * Save new article from content generator
 */
router.post('/articles', [
  body('title').isString().isLength({ min: 1 }).withMessage('Title is required'),
  body('slug').isString().isLength({ min: 1 }).withMessage('Slug is required'),
  body('content').isString().isLength({ min: 1 }).withMessage('Content is required'),
  body('wordCount').isInt({ min: 1 }).withMessage('Word count must be a positive integer'),
  body('readingTime').isInt({ min: 1 }).withMessage('Reading time must be a positive integer'),
  handleValidationErrors,
  ensureDatabase
], async (req, res) => {
  try {
    const article = req.body;
    const savedArticle = await req.app.locals.db.saveArticle(article);

    res.status(201).json({
      success: true,
      data: savedArticle,
      message: 'Article saved successfully',
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[API] Error saving article:', error.message);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        message: 'Article with this slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to save article',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/articles/top/:limit?
 * Get top performing articles
 */
router.get('/top/:limit?', [
  param('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  handleValidationErrors,
  ensureDatabase
], async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 10;
    const articles = await req.app.locals.db.getTopArticles(limit);

    res.json({
      success: true,
      data: articles,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        count: articles.length
      }
    });

  } catch (error) {
    console.error('[API] Error fetching top articles:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top articles',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const dbStatus = req.app.locals.db ? 'connected' : 'disconnected';
  
  res.json({
    success: true,
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('[API] Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;
