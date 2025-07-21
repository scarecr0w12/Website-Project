/**
 * Main server file for the viral content website
 * Handles Express.js server setup, database, and API routing
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// Import backend modules
const Database = require('./src/backend/database');
const apiRoutes = require('./src/backend/routes');
const AdminRoutes = require('./src/backend/admin-routes');

const app = express();

// Environment configuration
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize database
const db = new Database(process.env.DATABASE_PATH);

/**
 * Security and middleware setup
 */

// Enhanced security headers with admin panel support
app.use((req, res, next) => {
  // More specific VSCode detection to avoid false positives
  const userAgent = req.get('User-Agent') || '';
  const xForwardedFor = req.get('X-Forwarded-For') || '';
  
  // Only detect VSCode if there are clear indicators
  const isVSCode = (userAgent.includes('vscode') || 
                   userAgent.includes('Visual Studio Code') ||
                   xForwardedFor === 'vscode') && 
                   !userAgent.includes('Chrome') && 
                   !userAgent.includes('Firefox') && 
                   !userAgent.includes('Safari');
  
  // Check if this is an admin panel request
  const isAdminPanel = req.path.startsWith('/admin');
  
  if (isVSCode) {
    // Very permissive headers for VSCode Simple Browser
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src *; frame-src *; frame-ancestors *;");
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    next();
  } else if (isAdminPanel) {
    // Enhanced CSP for admin panel functionality - more permissive for external browsers
    const adminCSP = {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-eval for better security
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https:", "data:"],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
      },
    };
    
    // Only add upgradeInsecureRequests in production
    if (NODE_ENV === 'production') {
      adminCSP.directives.upgradeInsecureRequests = [];
    }
    
    helmet({
      contentSecurityPolicy: adminCSP,
      frameguard: { action: 'sameorigin' },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })(req, res, next);
  } else {
    // Standard security headers for public pages
    const publicCSP = {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https:", "data:"],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: NODE_ENV === 'development' 
          ? ["'self'", "vscode-webview:", "https:", "http:", "*"] 
          : ["'self'", "vscode-webview:", "https:"],
        objectSrc: ["'none'"],
        scriptSrcAttr: ["'none'"],
      },
    };
    
    // Add upgradeInsecureRequests only in production
    if (NODE_ENV === 'production') {
      publicCSP.directives.upgradeInsecureRequests = [];
    }
    
    helmet({
      contentSecurityPolicy: publicCSP,
      frameguard: NODE_ENV === 'development' 
        ? false 
        : { action: 'sameorigin' },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-origin" }
    })(req, res, next);
  }
});

// CORS configuration with admin panel support
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
    if (!origin) return callback(null, true);
    
    // Parse environment variable origins
    const allowedOrigins = process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : 
      ['http://localhost:3000', 'https://localhost:3000'];
    
    // Always allow localhost for development
    if (NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'https://localhost:3000', 'vscode-webview://');
    }
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('vscode-webview://')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Request-ID']
};
app.use(cors(corsOptions));

// Rate limiting with admin exemptions
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin authentication in development
    if (NODE_ENV === 'development' && req.path.startsWith('/admin/api/auth')) {
      return true;
    }
    return false;
  }
});
app.use('/api/', limiter);

// Separate, more lenient rate limiter for admin panel
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // More requests allowed for admin operations
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/admin/api/', adminLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing for admin sessions
app.use(require('cookie-parser')());

// Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Enhanced proxy trust configuration for better X-Forwarded-For handling
if (NODE_ENV === 'production') {
  // In production, trust only the first proxy (load balancer/reverse proxy)
  app.set('trust proxy', 1);
} else {
  // In development, trust localhost only to avoid rate limiting bypass
  app.set('trust proxy', 'loopback');
}

// Make database available to routes
app.locals.db = db;

/**
 * Routes
 */

// API routes
app.use('/api/v1', apiRoutes);

// Admin routes will be initialized after database is ready
let adminRoutes;

// VSCode Simple Browser friendly route
app.get('/vscode', (req, res) => {
  res.setHeader('Content-Security-Policy', '');
  res.setHeader('X-Frame-Options', '');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint

// Static files with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// Serve articles at root level for SEO
app.get('/article/:slug', async (req, res) => {
  try {
    const article = await db.getArticleBySlug(req.params.slug);
    
    if (!article) {
      return res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
    }

    // Generate SEO-optimized HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.seo_title || article.title}</title>
    <meta name="description" content="${article.seo_description || article.excerpt}">
    <meta name="keywords" content="${Array.isArray(article.keywords) ? article.keywords.join(', ') : ''}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${req.protocol}://${req.get('host')}/article/${article.slug}">
    <meta property="og:title" content="${article.og_title || article.title}">
    <meta property="og:description" content="${article.og_description || article.excerpt}">
    <meta property="og:site_name" content="Viral Content Hub">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${req.protocol}://${req.get('host')}/article/${article.slug}">
    <meta name="twitter:title" content="${article.title}">
    <meta name="twitter:description" content="${article.excerpt}">
    
    <!-- Article metadata -->
    <meta name="article:published_time" content="${article.published_at}">
    <meta name="article:modified_time" content="${article.updated_at}">
    <meta name="article:author" content="Viral Content Hub">
    <meta name="article:section" content="${article.content_type}">
    
    <!-- Schema.org structured data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${article.title}",
      "description": "${article.excerpt}",
      "author": {
        "@type": "Organization",
        "name": "Viral Content Hub"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Viral Content Hub"
      },
      "datePublished": "${article.published_at}",
      "dateModified": "${article.updated_at}",
      "wordCount": ${article.word_count},
      "timeRequired": "PT${article.reading_time}M",
      "articleSection": "${article.content_type}",
      "keywords": "${Array.isArray(article.keywords) ? article.keywords.join(', ') : ''}"
    }
    </script>
    
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div id="app" data-article-slug="${article.slug}">
        <article class="article-content">
            <header>
                <h1>${article.title}</h1>
                <div class="article-meta">
                    <span class="reading-time">${article.reading_time} min read</span>
                    <span class="word-count">${article.word_count} words</span>
                    <span class="publish-date">${new Date(article.published_at).toLocaleDateString()}</span>
                </div>
            </header>
            <div class="content">
                ${article.html_content}
            </div>
            <footer>
                <div class="article-tags">
                    ${Array.isArray(article.keywords) ? article.keywords.slice(0, 5).map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                </div>
                <div class="share-buttons">
                    <button onclick="shareArticle('twitter')" class="share-btn twitter">Share on Twitter</button>
                    <button onclick="shareArticle('facebook')" class="share-btn facebook">Share on Facebook</button>
                    <button onclick="shareArticle('linkedin')" class="share-btn linkedin">Share on LinkedIn</button>
                </div>
            </footer>
        </article>
    </div>
    <script src="/script.js"></script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('[Server] Error serving article:', error.message);
    res.status(500).sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Main homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Legacy health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running!',
        timestamp: new Date().toISOString()
    });
});

/**
 * Error handling
 */
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    requestId: req.id
  });
});

/**
 * Server initialization
 */
async function startServer() {
  try {
    // Initialize database
    await db.initialize();
    console.log('✅ Database initialized successfully');
    
    // Initialize admin routes after database is ready
    const AdminRoutes = require('./src/backend/admin-routes');
    const adminRoutes = new AdminRoutes(db);
    app.use('/admin', adminRoutes.getRouter());
    console.log('✅ Admin system initialized successfully');

    // Catch-all for SPA routing - MUST be after all specific routes
    app.get('*', (req, res) => {
      // Exclude API and admin routes from catch-all
      if (req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
        return res.status(404).json({ 
          success: false, 
          message: 'Not Found',
          path: req.path 
        });
      }
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Viral Content Website running at http://localhost:${PORT}`);
      console.log(`📊 API Health: http://localhost:${PORT}/api/v1/health`);
      console.log(`🔗 API Docs: http://localhost:${PORT}/api/v1/articles`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        // Close database connection
        await db.close();
        console.log('Database connection closed');
        
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, db };
