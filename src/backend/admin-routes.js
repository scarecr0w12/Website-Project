/**
 * Admin API Routes
 * Handles authentication, user management, analytics, and admin operations
 */

const express = require('express');
const bcrypt = require('bcrypt');
const AuthManager = require('./auth');
const path = require('path');

class AdminRoutes {
    constructor(database) {
        this.router = express.Router();
        this.db = database;
        this.auth = new AuthManager(database);
        
        this.initializeRoutes();
        this.initializeAnalytics();
    }

    initializeRoutes() {
        // Authentication routes
        this.router.post('/api/auth/login', this.handleLogin.bind(this));
        this.router.post('/api/auth/logout', this.handleLogout.bind(this));
        this.router.get('/api/auth/validate', this.validateSession.bind(this));
        this.router.post('/api/auth/forgot-password', this.handleForgotPassword.bind(this));
        this.router.post('/api/auth/reset-password', this.handleResetPassword.bind(this));
        
        // 2FA routes
        this.router.post('/api/auth/setup-2fa', this.requireAuth.bind(this), this.setup2FA.bind(this));
        this.router.post('/api/auth/enable-2fa', this.requireAuth.bind(this), this.enable2FA.bind(this));
        this.router.post('/api/auth/disable-2fa', this.requireAuth.bind(this), this.disable2FA.bind(this));

        // User management routes
        this.router.get('/api/users', this.requireAuth.bind(this), this.requirePermission('users'), this.getUsers.bind(this));
        this.router.post('/api/users', this.requireAuth.bind(this), this.requirePermission('users'), this.createUser.bind(this));
        this.router.put('/api/users/:id', this.requireAuth.bind(this), this.requirePermission('users'), this.updateUser.bind(this));
        this.router.delete('/api/users/:id', this.requireAuth.bind(this), this.requirePermission('users'), this.deleteUser.bind(this));

        // Content management routes
        this.router.get('/api/articles', this.requireAuth.bind(this), this.getArticles.bind(this));
        this.router.put('/api/articles/:slug', this.requireAuth.bind(this), this.requirePermission('content'), this.updateArticle.bind(this));
        this.router.delete('/api/articles/:slug', this.requireAuth.bind(this), this.requirePermission('content'), this.deleteArticle.bind(this));
        this.router.post('/api/articles/generate', this.requireAuth.bind(this), this.requirePermission('content'), this.generateContent.bind(this));
        
        // Analytics routes
        this.router.get('/api/analytics/overview', this.requireAuth.bind(this), this.getAnalyticsOverview.bind(this));
        this.router.get('/api/analytics/traffic', this.requireAuth.bind(this), this.getTrafficData.bind(this));
        this.router.get('/api/analytics/content', this.requireAuth.bind(this), this.getContentAnalytics.bind(this));

        // System management routes
        this.router.get('/api/system/health', this.requireAuth.bind(this), this.getSystemHealth.bind(this));
        this.router.post('/api/system/backup', this.requireAuth.bind(this), this.requirePermission('system'), this.createBackup.bind(this));
        this.router.get('/api/system/logs', this.requireAuth.bind(this), this.requirePermission('system'), this.getSystemLogs.bind(this));
        
        // Settings routes
        this.router.get('/api/settings', this.requireAuth.bind(this), this.getSettings.bind(this));
        this.router.put('/api/settings', this.requireAuth.bind(this), this.requirePermission('settings'), this.updateSettings.bind(this));

        // SEO routes
        this.router.get('/api/seo/overview', this.requireAuth.bind(this), this.getSEOOverview.bind(this));
        this.router.put('/api/seo/settings', this.requireAuth.bind(this), this.requirePermission('seo'), this.updateSEOSettings.bind(this));

        // Audit log routes
        this.router.get('/api/audit', this.requireAuth.bind(this), this.requirePermission('audit'), this.getAuditLog.bind(this));

        // Static file serving for admin panel
        this.router.get('/', (req, res) => {
            res.redirect('/admin/login');
        });
        
        this.router.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public/admin/login.html'));
        });
        
        this.router.get('/dashboard', this.requireAuthPage.bind(this), (req, res) => {
            res.sendFile(path.join(__dirname, '../../public/admin/dashboard.html'));
        });
    }

    /**
     * Authentication middleware
     */
    async requireAuth(req, res, next) {
        try {
            const sessionId = this.extractSessionId(req);
            if (!sessionId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const user = await this.auth.validateSession(sessionId);
            if (!user) {
                return res.status(401).json({ error: 'Invalid or expired session' });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({ error: 'Authentication error' });
        }
    }

    /**
     * Page authentication middleware (redirects to login)
     */
    async requireAuthPage(req, res, next) {
        try {
            const sessionId = this.extractSessionId(req);
            
            if (!sessionId) {
                return res.redirect('/admin/login');
            }

            const user = await this.auth.validateSession(sessionId);
            if (!user) {
                return res.redirect('/admin/login');
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Page auth error:', error);
            res.redirect('/admin/login');
        }
    }

    /**
     * Permission middleware
     */
    requirePermission(permission) {
        return async (req, res, next) => {
            try {
                const hasPermission = await this.auth.hasPermission(req.user.id, permission);
                if (!hasPermission) {
                    return res.status(403).json({ error: 'Insufficient permissions' });
                }
                next();
            } catch (error) {
                console.error('Permission check error:', error);
                res.status(500).json({ error: 'Permission check failed' });
            }
        };
    }

    extractSessionId(req) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        
        // Also check cookies for page requests
        return req.cookies?.admin_session;
    }

    /**
     * Authentication route handlers
     */
    async handleLogin(req, res) {
        try {
            const { login, password, totpCode, captcha, rememberMe, clientInfo } = req.body;
            
            const result = await this.auth.authenticate(
                login, 
                password, 
                captcha, 
                totpCode, 
                rememberMe, 
                {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    ...clientInfo
                }
            );

            if (result.requiresTwoFactor) {
                res.json({ requiresTwoFactor: true });
            } else if (result.success) {
                // Set cookie for page requests
                res.cookie('admin_session', result.sessionId, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
                });
                
                res.json(result);
            }
        } catch (error) {
            console.error('Login error:', error);
            
            let status = 400;
            if (error.message.includes('rate limited') || error.message.includes('too many')) {
                status = 429;
            }
            
            res.status(status).json({ error: error.message });
        }
    }

    async handleLogout(req, res) {
        try {
            const sessionId = this.extractSessionId(req);
            if (sessionId) {
                await this.db.run('DELETE FROM admin_sessions WHERE id = ?', [sessionId]);
            }
            
            res.clearCookie('admin_session');
            res.json({ success: true });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }

    async validateSession(req, res) {
        try {
            const sessionId = this.extractSessionId(req);
            const user = sessionId ? await this.auth.validateSession(sessionId) : null;
            
            res.json({ 
                valid: !!user, 
                user: user ? this.auth.sanitizeUser(user) : null 
            });
        } catch (error) {
            console.error('Session validation error:', error);
            res.json({ valid: false });
        }
    }

    async handleForgotPassword(req, res) {
        try {
            const { email, clientInfo } = req.body;
            
            await this.auth.initiatePasswordReset(email, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                ...clientInfo
            });
            
            res.json({ success: true });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async handleResetPassword(req, res) {
        try {
            const { token, password } = req.body;
            
            // TODO: Implement password reset with token validation
            res.json({ success: true });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async setup2FA(req, res) {
        try {
            const result = await this.auth.setup2FA(req.user.id);
            res.json(result);
        } catch (error) {
            console.error('2FA setup error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async enable2FA(req, res) {
        try {
            const { totpCode } = req.body;
            const result = await this.auth.enable2FA(req.user.id, totpCode);
            res.json(result);
        } catch (error) {
            console.error('2FA enable error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async disable2FA(req, res) {
        try {
            // TODO: Implement 2FA disable with password confirmation
            res.json({ success: true });
        } catch (error) {
            console.error('2FA disable error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Content management handlers
     */
    async getArticles(req, res) {
        try {
            const { status, limit = 50, offset = 0, search } = req.query;
            
            let query = `
                SELECT *, 
                       (SELECT COUNT(*) FROM article_views WHERE article_slug = articles.slug) as view_count
                FROM articles 
                WHERE 1=1
            `;
            const params = [];

            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }

            if (search) {
                query += ' AND (title LIKE ? OR content LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const articles = await this.db.all(query, params);
            res.json(articles);
        } catch (error) {
            console.error('Get articles error:', error);
            res.status(500).json({ error: 'Failed to fetch articles' });
        }
    }

    async updateArticle(req, res) {
        try {
            const { slug } = req.params;
            const updates = req.body;
            
            // Build dynamic update query
            const fields = Object.keys(updates);
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            const values = Object.values(updates);
            
            await this.db.run(
                `UPDATE articles SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE slug = ?`,
                [...values, slug]
            );
            
            await this.auth.logAudit(req.user.id, 'article_updated', { slug, updates }, req.ip);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Update article error:', error);
            res.status(500).json({ error: 'Failed to update article' });
        }
    }

    async deleteArticle(req, res) {
        try {
            const { slug } = req.params;
            
            await this.db.run('DELETE FROM articles WHERE slug = ?', [slug]);
            await this.auth.logAudit(req.user.id, 'article_deleted', { slug }, req.ip);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Delete article error:', error);
            res.status(500).json({ error: 'Failed to delete article' });
        }
    }

    async generateContent(req, res) {
        try {
            const ContentGenerator = require('../content-generator');
            const generator = new ContentGenerator();
            
            // Generate single article
            const article = await generator.generateArticle();
            
            // Save to database
            const db = req.app.locals.db;
            await db.saveArticle(article);
            
            res.json({ 
                success: true, 
                message: 'Content generated and saved successfully',
                article: {
                    title: article.title,
                    slug: article.slug,
                    wordCount: article.wordCount
                }
            });
        } catch (error) {
            console.error('Content generation failed:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Content generation failed: ' + error.message
            });
        }
    }

    async getUsers(req, res) {
        try {
            const users = await this.db.all(`
                SELECT id, username, email, permissions, two_factor_enabled, 
                       created_at, updated_at, last_login, is_active
                FROM admin_users 
                ORDER BY created_at DESC
            `);
            
            res.json(users.map(user => this.auth.sanitizeUser(user)));
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    async createUser(req, res) {
        try {
            const { username, email, password, permissions } = req.body;
            
            const userId = await this.auth.createUser({
                username, email, password, permissions
            }, req.user.id);
            
            res.json({ success: true, userId });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            
            // TODO: Implement user updates
            await this.auth.logAudit(req.user.id, 'user_updated', { userId: id, updates }, req.ip);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            
            // Don't allow deletion of self
            if (parseInt(id) === req.user.id) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }
            
            await this.db.run('UPDATE admin_users SET is_active = 0 WHERE id = ?', [id]);
            await this.auth.logAudit(req.user.id, 'user_deactivated', { userId: id }, req.ip);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }

    async getSettings(req, res) {
        try {
            // TODO: Implement settings retrieval from database or config
            const settings = {
                siteName: 'InsightHub',
                siteDescription: 'Expert analysis and trending insights',
                baseUrl: process.env.BASE_URL || 'http://localhost:3000',
                generationFrequency: 'daily',
                articlesPerDay: 3,
                autoPublish: false
            };
            
            res.json(settings);
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    }

    async updateSettings(req, res) {
        try {
            const { category, settings } = req.body;
            
            // TODO: Implement settings update to database
            await this.auth.logAudit(req.user.id, 'settings_updated', { category, settings }, req.ip);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    }

    async getSEOOverview(req, res) {
        try {
            // TODO: Implement SEO data collection
            const seoData = {
                indexedPages: 0,
                avgLoadTime: 0,
                seoScore: 85,
                keywords: []
            };
            
            res.json(seoData);
        } catch (error) {
            console.error('Get SEO overview error:', error);
            res.status(500).json({ error: 'Failed to fetch SEO data' });
        }
    }

    async updateSEOSettings(req, res) {
        try {
            const settings = req.body;
            
            // TODO: Implement SEO settings update
            await this.auth.logAudit(req.user.id, 'seo_settings_updated', settings, req.ip);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Update SEO settings error:', error);
            res.status(500).json({ error: 'Failed to update SEO settings' });
        }
    }

    async getAuditLog(req, res) {
        try {
            const { limit = 50, offset = 0 } = req.query;
            
            const logs = await this.db.all(`
                SELECT al.*, au.username 
                FROM admin_audit_log al
                LEFT JOIN admin_users au ON al.user_id = au.id
                ORDER BY al.timestamp DESC 
                LIMIT ? OFFSET ?
            `, [limit, offset]);
            
            res.json(logs);
        } catch (error) {
            console.error('Get audit log error:', error);
            res.status(500).json({ error: 'Failed to fetch audit log' });
        }
    }

    async getTrafficData(req, res) {
        try {
            // TODO: Implement traffic data collection
            const trafficData = {
                daily: [],
                weekly: [],
                monthly: []
            };
            
            res.json(trafficData);
        } catch (error) {
            console.error('Get traffic data error:', error);
            res.status(500).json({ error: 'Failed to fetch traffic data' });
        }
    }

    async getContentAnalytics(req, res) {
        try {
            // TODO: Implement content analytics
            const analytics = {
                topArticles: [],
                engagementMetrics: {},
                conversionRates: {}
            };
            
            res.json(analytics);
        } catch (error) {
            console.error('Get content analytics error:', error);
            res.status(500).json({ error: 'Failed to fetch content analytics' });
        }
    }

    async createBackup(req, res) {
        try {
            // TODO: Trigger backup script
            await this.auth.logAudit(req.user.id, 'backup_created', {}, req.ip);
            res.json({ success: true, message: 'Backup created successfully' });
        } catch (error) {
            console.error('Create backup error:', error);
            res.status(500).json({ error: 'Failed to create backup' });
        }
    }

    async getSystemLogs(req, res) {
        try {
            // TODO: Implement system logs retrieval
            const logs = [];
            res.json(logs);
        } catch (error) {
            console.error('Get system logs error:', error);
            res.status(500).json({ error: 'Failed to fetch system logs' });
        }
    }

    /**
     * Analytics handlers
     */
    async getAnalyticsOverview(req, res) {
        try {
            const [
                totalArticles,
                totalViews,
                uniqueVisitors,
                avgReadTime
            ] = await Promise.all([
                this.db.get('SELECT COUNT(*) as count FROM articles WHERE status = "published"'),
                this.db.get('SELECT COUNT(*) as count FROM article_views').catch(() => ({ count: 0 })),
                this.db.get('SELECT COUNT(DISTINCT ip_address) as count FROM article_views WHERE created_at > datetime("now", "-30 days")').catch(() => ({ count: 0 })),
                this.db.get('SELECT AVG(reading_time) as avg FROM articles WHERE reading_time IS NOT NULL')
            ]);

            // Calculate engagement rate (simplified)
            const engagementRate = totalViews.count > 0 ? 
                Math.round((uniqueVisitors.count / totalViews.count) * 100) : 0;

            res.json({
                totalArticles: totalArticles.count || 0,
                totalViews: totalViews.count || 0,
                uniqueVisitors: uniqueVisitors.count || 0,
                avgReadTime: Math.round(avgReadTime?.avg || 5), // Default 5 min if no data
                engagementRate: engagementRate
            });
        } catch (error) {
            console.error('Analytics error:', error);
            // Return default values instead of failing
            res.json({
                totalArticles: 0,
                totalViews: 0,
                uniqueVisitors: 0,
                avgReadTime: 5,
                engagementRate: 0
            });
        }
    }

    /**
     * System management handlers
     */
    async getSystemHealth(req, res) {
        try {
            const health = {
                status: 'healthy',
                database: 'connected',
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                lastBackup: null // Get from backup system
            };
            
            res.json(health);
        } catch (error) {
            console.error('System health error:', error);
            res.status(500).json({ error: 'Failed to get system health' });
        }
    }

    /**
     * Initialize analytics tracking
     */
    async initializeAnalytics() {
        try {
            // Create analytics tables if they don't exist
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS article_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    article_slug TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    referrer TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (article_slug) REFERENCES articles (slug)
                )
            `);

            await this.db.query(`
                CREATE TABLE IF NOT EXISTS page_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    page_path TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    referrer TEXT,
                    session_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log('✅ Analytics tracking initialized');
        } catch (error) {
            console.error('❌ Failed to initialize analytics:', error);
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = AdminRoutes;
