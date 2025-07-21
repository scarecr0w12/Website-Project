/**
 * Authentication and Authorization System
 * Handles admin user management, sessions, 2FA, and permissions
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

class AuthManager {
    constructor(database) {
        this.db = database;
        this.sessions = new Map(); // In-memory session store (consider Redis for production)
        this.resetTokens = new Map();
        this.rateLimits = new Map(); // Rate limiting for login attempts
        
        // Initialize email transporter for password reset (optional)
        try {
            this.emailTransporter = this.setupEmailTransporter();
        } catch (error) {
            console.warn('⚠️ Email transporter not configured - password reset via email disabled');
            this.emailTransporter = null;
        }
        
        // Initialize database tables
        this.initializeTables();
    }

    /**
     * Initialize user and session tables
     */
    async initializeTables() {
        const userTableSQL = `
            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                permissions TEXT NOT NULL DEFAULT '[]',
                two_factor_secret TEXT,
                two_factor_enabled INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active INTEGER DEFAULT 1,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME
            )
        `;

        const sessionTableSQL = `
            CREATE TABLE IF NOT EXISTS admin_sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at DATETIME NOT NULL,
                remember_me INTEGER DEFAULT 0,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES admin_users (id)
            )
        `;

        const passwordResetTableSQL = `
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                expires_at DATETIME NOT NULL,
                used INTEGER DEFAULT 0,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES admin_users (id)
            )
        `;

        const settingsTableSQL = `
            CREATE TABLE IF NOT EXISTS admin_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(category, key)
            )
        `;

        const auditTableSQL = `
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES admin_users (id)
            )
        `;

        try {
            // Use the database query method instead of exec
            await this.db.query(userTableSQL);
            await this.db.query(sessionTableSQL);
            await this.db.query(passwordResetTableSQL);
            await this.db.query(settingsTableSQL);
            await this.db.query(auditTableSQL);
            
            // Create default admin user if none exists
            await this.createDefaultAdmin();
            
            console.log('✅ Authentication tables initialized');
        } catch (error) {
            console.error('❌ Failed to initialize auth tables:', error);
            throw error;
        }
    }

    /**
     * Create default admin user if database is empty
     */
    async createDefaultAdmin() {
        try {
            const existingUsers = await this.db.get('SELECT COUNT(*) as count FROM admin_users');
            
            if (existingUsers && existingUsers.count === 0) {
                const defaultPassword = crypto.randomBytes(12).toString('hex');
                const hashedPassword = await bcrypt.hash(defaultPassword, 12);
                
                await this.db.insert('admin_users', {
                    username: 'admin',
                    email: 'admin@localhost',
                    password_hash: hashedPassword,
                    permissions: JSON.stringify(['all']) // Full permissions
                });
                
                console.log(`🔑 Default admin user created:`);
                console.log(`   Username: admin`);
                console.log(`   Password: ${defaultPassword}`);
                console.log(`   Email: admin@localhost`);
                console.log(`⚠️  Please change this password immediately!`);
            }
        } catch (error) {
            // If table doesn't exist yet, that's fine - we'll handle it later
            if (!error.message.includes('no such table')) {
                console.error('Failed to create default admin:', error);
            }
        }
    }

    /**
     * Authenticate user with username/email and password
     * Includes rate limiting and account lockout protection
     */
    async authenticate(login, password, captchaResponse = null, totpCode = null, rememberMe = false, clientInfo = {}) {
        const { ip, userAgent } = clientInfo;
        
        // Check rate limiting
        if (this.isRateLimited(ip, login)) {
            await this.logAudit(null, 'login_rate_limited', { login, ip }, ip, userAgent);
            throw new Error('Too many login attempts. Please try again later.');
        }

        // TODO: Verify captcha if required
        // if (captchaResponse && !await this.verifyCaptcha(captchaResponse)) {
        //     throw new Error('Invalid captcha');
        // }

        try {
            // Find user by username or email
            const user = await this.db.get(`
                SELECT * FROM admin_users 
                WHERE (username = ? OR email = ?) AND is_active = 1
            `, [login, login]);

            if (!user) {
                this.recordFailedAttempt(ip, login);
                throw new Error('Invalid credentials');
            }

            // Check if account is locked
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                throw new Error('Account is temporarily locked due to multiple failed attempts');
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                await this.recordFailedLogin(user.id, ip);
                this.recordFailedAttempt(ip, login);
                throw new Error('Invalid credentials');
            }

            // Check 2FA if enabled
            if (user.two_factor_enabled) {
                if (!totpCode) {
                    return { requiresTwoFactor: true, userId: user.id };
                }
                
                const validTotp = speakeasy.totp.verify({
                    secret: user.two_factor_secret,
                    encoding: 'base32',
                    token: totpCode,
                    window: 2 // Allow 2 time windows (±30 seconds)
                });

                if (!validTotp) {
                    await this.recordFailedLogin(user.id, ip);
                    throw new Error('Invalid 2FA code');
                }
            }

            // Successful login - reset failed attempts and create session
            await this.resetFailedAttempts(user.id);
            this.clearRateLimit(ip, login);
            
            const sessionId = await this.createSession(user.id, rememberMe, ip, userAgent);
            await this.updateLastLogin(user.id);
            await this.logAudit(user.id, 'login_success', { method: '2fa_enabled' }, ip, userAgent);

            return {
                success: true,
                sessionId,
                user: this.sanitizeUser(user)
            };

        } catch (error) {
            await this.logAudit(null, 'login_failed', { login, error: error.message }, ip, userAgent);
            throw error;
        }
    }

    /**
     * Create a new session for authenticated user
     */
    async createSession(userId, rememberMe = false, ip = null, userAgent = null) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        
        // Remember me sessions last 30 days, regular sessions 24 hours
        expiresAt.setHours(expiresAt.getHours() + (rememberMe ? 720 : 24));
        
        await this.db.run(`
            INSERT INTO admin_sessions (id, user_id, expires_at, remember_me, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [sessionId, userId, expiresAt.toISOString(), rememberMe ? 1 : 0, ip, userAgent]);
        
        return sessionId;
    }

    /**
     * Validate session and return user data
     */
    async validateSession(sessionId) {
        if (!sessionId) return null;

        try {
            const session = await this.db.get(`
                SELECT s.*, u.* 
                FROM admin_sessions s
                JOIN admin_users u ON s.user_id = u.id
                WHERE s.id = ? AND s.expires_at > datetime('now') AND u.is_active = 1
            `, [sessionId]);

            if (!session) {
                return null;
            }

            // Extend session if it's a remember-me session
            if (session.remember_me) {
                const newExpiry = new Date();
                newExpiry.setHours(newExpiry.getHours() + 720); // 30 days
                
                await this.db.run(`
                    UPDATE admin_sessions 
                    SET expires_at = ? 
                    WHERE id = ?
                `, [newExpiry.toISOString(), sessionId]);
            }

            return this.sanitizeUser(session);
        } catch (error) {
            console.error('Session validation error:', error);
            return null;
        }
    }

    /**
     * Setup 2FA for a user
     */
    async setup2FA(userId) {
        const user = await this.db.get('SELECT * FROM admin_users WHERE id = ?', [userId]);
        if (!user) throw new Error('User not found');

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `InsightHub Admin (${user.username})`,
            issuer: 'InsightHub'
        });

        // Save secret to database (not yet enabled)
        await this.db.run(`
            UPDATE admin_users 
            SET two_factor_secret = ? 
            WHERE id = ?
        `, [secret.base32, userId]);

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            backupCodes: this.generateBackupCodes(8) // Generate backup codes
        };
    }

    /**
     * Enable 2FA after verification
     */
    async enable2FA(userId, totpCode) {
        const user = await this.db.get('SELECT * FROM admin_users WHERE id = ?', [userId]);
        if (!user || !user.two_factor_secret) {
            throw new Error('2FA setup not found');
        }

        // Verify the TOTP code
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: totpCode,
            window: 2
        });

        if (!verified) {
            throw new Error('Invalid verification code');
        }

        // Enable 2FA
        await this.db.run(`
            UPDATE admin_users 
            SET two_factor_enabled = 1 
            WHERE id = ?
        `, [userId]);

        await this.logAudit(userId, '2fa_enabled', {}, null, null);
        return { success: true };
    }

    /**
     * Generate backup codes for 2FA
     */
    generateBackupCodes(count = 8) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }

    /**
     * Check if user has specific permission
     */
    async hasPermission(userId, permission) {
        const user = await this.db.get('SELECT permissions FROM admin_users WHERE id = ? AND is_active = 1', [userId]);
        if (!user) return false;

        const permissions = JSON.parse(user.permissions || '[]');
        return permissions.includes('all') || permissions.includes(permission);
    }

    /**
     * User management functions
     */
    async createUser(userData, createdBy) {
        const { username, email, password, permissions = [] } = userData;
        
        // Validate input
        if (!username || !email || !password) {
            throw new Error('Username, email, and password are required');
        }

        // Check for existing user
        const existing = await this.db.get(`
            SELECT id FROM admin_users 
            WHERE username = ? OR email = ?
        `, [username, email]);

        if (existing) {
            throw new Error('Username or email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const result = await this.db.run(`
            INSERT INTO admin_users (username, email, password_hash, permissions)
            VALUES (?, ?, ?, ?)
        `, [username, email, passwordHash, JSON.stringify(permissions)]);

        await this.logAudit(createdBy, 'user_created', { newUserId: result.lastID, username }, null, null);
        
        return result.lastID;
    }

    /**
     * Utility functions
     */
    sanitizeUser(user) {
        const { password_hash, two_factor_secret, ...sanitized } = user;
        
        // Handle permissions safely
        try {
            if (typeof sanitized.permissions === 'string') {
                // If permissions is a simple string like 'all', convert to array
                if (sanitized.permissions === 'all') {
                    sanitized.permissions = ['all'];
                } else {
                    // Try to parse as JSON, fallback to array with single value
                    try {
                        sanitized.permissions = JSON.parse(sanitized.permissions);
                    } catch {
                        sanitized.permissions = [sanitized.permissions];
                    }
                }
            } else if (Array.isArray(sanitized.permissions)) {
                // Already an array, keep as is
                sanitized.permissions = sanitized.permissions;
            } else {
                // Default fallback
                sanitized.permissions = [];
            }
        } catch (error) {
            console.error('Permission sanitization error:', error);
            sanitized.permissions = [];
        }
        
        return sanitized;
    }

    isRateLimited(ip, login) {
        const key = `${ip}-${login}`;
        const attempts = this.rateLimits.get(key) || { count: 0, resetAt: Date.now() };
        
        if (Date.now() > attempts.resetAt) {
            this.rateLimits.delete(key);
            return false;
        }
        
        return attempts.count >= 5; // 5 attempts per 15 minutes
    }

    recordFailedAttempt(ip, login) {
        const key = `${ip}-${login}`;
        const attempts = this.rateLimits.get(key) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
        attempts.count++;
        this.rateLimits.set(key, attempts);
    }

    clearRateLimit(ip, login) {
        const key = `${ip}-${login}`;
        this.rateLimits.delete(key);
    }

    async recordFailedLogin(userId, ip) {
        await this.db.run(`
            UPDATE admin_users 
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE 
                    WHEN failed_login_attempts >= 4 THEN datetime('now', '+30 minutes')
                    ELSE locked_until 
                END
            WHERE id = ?
        `, [userId]);
    }

    async resetFailedAttempts(userId) {
        await this.db.run(`
            UPDATE admin_users 
            SET failed_login_attempts = 0, locked_until = NULL
            WHERE id = ?
        `, [userId]);
    }

    async updateLastLogin(userId) {
        await this.db.run(`
            UPDATE admin_users 
            SET last_login = datetime('now')
            WHERE id = ?
        `, [userId]);
    }

    /**
     * Settings management
     */
    async getSetting(category, key) {
        const setting = await this.db.get(`
            SELECT value FROM admin_settings 
            WHERE category = ? AND key = ?
        `, [category, key]);
        
        return setting ? JSON.parse(setting.value) : null;
    }

    async getSettings(category) {
        const settings = await this.db.all(`
            SELECT key, value FROM admin_settings 
            WHERE category = ?
        `, [category]);
        
        const result = {};
        for (const setting of settings) {
            result[setting.key] = JSON.parse(setting.value);
        }
        return result;
    }

    async setSetting(category, key, value, userId = null) {
        const jsonValue = JSON.stringify(value);
        
        await this.db.run(`
            INSERT OR REPLACE INTO admin_settings (category, key, value, updated_at)
            VALUES (?, ?, ?, datetime('now'))
        `, [category, key, jsonValue]);

        if (userId) {
            await this.logAudit(userId, 'setting_updated', { category, key, value }, null, null);
        }
    }

    async setSettings(category, settings, userId = null) {
        for (const [key, value] of Object.entries(settings)) {
            await this.setSetting(category, key, value, userId);
        }
    }

    async deleteSetting(category, key, userId = null) {
        await this.db.run(`
            DELETE FROM admin_settings 
            WHERE category = ? AND key = ?
        `, [category, key]);

        if (userId) {
            await this.logAudit(userId, 'setting_deleted', { category, key }, null, null);
        }
    }
    async logAudit(userId, action, details = {}, ip = null, userAgent = null) {
        try {
            await this.db.run(`
                INSERT INTO admin_audit_log (user_id, action, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, action, JSON.stringify(details), ip, userAgent]);
        } catch (error) {
            console.error('Failed to log audit event:', error);
        }
    }

    /**
     * Setup email transporter for password reset
     */
    setupEmailTransporter() {
        // This would be configured with actual SMTP settings
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Password reset functionality
     */
    async initiatePasswordReset(email, clientInfo = {}) {
        const user = await this.db.get('SELECT * FROM admin_users WHERE email = ? AND is_active = 1', [email]);
        
        if (!user) {
            // Don't reveal if email exists or not
            return { success: true };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store reset token in database instead of memory for persistence
        await this.db.run(`
            INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        `, [resetToken, user.id, expiresAt.toISOString(), new Date().toISOString()]);

        // Send password reset email
        if (this.emailTransporter) {
            try {
                await this.emailTransporter.sendMail({
                    from: process.env.FROM_EMAIL || 'noreply@insighthub.local',
                    to: email,
                    subject: 'InsightHub Admin - Password Reset Request',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #333;">Password Reset Request</h2>
                            <p>A password reset was requested for your InsightHub admin account.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}" 
                                   style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                                   Reset Password
                                </a>
                            </div>
                            <p><strong>This link expires in 1 hour.</strong></p>
                            <p style="color: #666;">If you didn't request this reset, please ignore this email.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                            <p style="font-size: 12px; color: #999;">InsightHub Security Team</p>
                        </div>
                    `
                });
                
                await this.logAudit(user.id, 'password_reset_requested', {}, clientInfo.ip, clientInfo.userAgent);
            } catch (error) {
                console.error('Failed to send password reset email:', error);
            }
        } else {
            console.warn('Password reset requested but email not configured');
        }

        return { success: true };
    }

    /**
     * Validate password reset token and reset password
     */
    async resetPassword(token, newPassword, clientInfo = {}) {
        if (!token || !newPassword) {
            throw new Error('Token and new password are required');
        }

        if (newPassword.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        // Find valid token
        const tokenData = await this.db.get(`
            SELECT prt.*, u.username, u.email 
            FROM password_reset_tokens prt
            JOIN admin_users u ON prt.user_id = u.id
            WHERE prt.token = ? AND prt.expires_at > datetime('now') AND prt.used = 0
        `, [token]);

        if (!tokenData) {
            throw new Error('Invalid or expired reset token');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Update password and mark token as used
        await this.db.run(`
            UPDATE admin_users 
            SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL
            WHERE id = ?
        `, [passwordHash, tokenData.user_id]);

        await this.db.run(`
            UPDATE password_reset_tokens 
            SET used = 1, used_at = datetime('now')
            WHERE token = ?
        `, [token]);

        // Invalidate all sessions for this user (force re-login)
        await this.db.run('DELETE FROM admin_sessions WHERE user_id = ?', [tokenData.user_id]);

        await this.logAudit(tokenData.user_id, 'password_reset_completed', {}, clientInfo.ip, clientInfo.userAgent);

        return { success: true, username: tokenData.username };
    }

    /**
     * Update user profile
     */
    async updateUser(userId, updates, updatedBy) {
        const allowedFields = ['username', 'email', 'permissions'];
        const validUpdates = {};

        // Filter and validate updates
        for (const [field, value] of Object.entries(updates)) {
            if (allowedFields.includes(field)) {
                if (field === 'username' || field === 'email') {
                    if (!value || value.trim().length === 0) {
                        throw new Error(`${field} cannot be empty`);
                    }
                    
                    if (field === 'email') {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                            throw new Error('Invalid email format');
                        }
                    }

                    // Check for duplicates (exclude current user)
                    const existing = await this.db.get(`
                        SELECT id FROM admin_users 
                        WHERE ${field} = ? AND id != ?
                    `, [value, userId]);

                    if (existing) {
                        throw new Error(`${field} already exists`);
                    }

                    validUpdates[field] = value.trim();
                } else if (field === 'permissions') {
                    validUpdates[field] = JSON.stringify(Array.isArray(value) ? value : [value]);
                }
            }
        }

        if (Object.keys(validUpdates).length === 0) {
            throw new Error('No valid updates provided');
        }

        // Build update query
        const fields = Object.keys(validUpdates);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = Object.values(validUpdates);

        await this.db.run(`
            UPDATE admin_users 
            SET ${setClause}, updated_at = datetime('now')
            WHERE id = ?
        `, [...values, userId]);

        await this.logAudit(updatedBy, 'user_updated', { userId, updates: validUpdates }, null, null);

        return { success: true };
    }

    /**
     * Disable 2FA for a user
     */
    async disable2FA(userId, currentPassword) {
        const user = await this.db.get('SELECT * FROM admin_users WHERE id = ?', [userId]);
        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            throw new Error('Invalid current password');
        }

        // Disable 2FA
        await this.db.run(`
            UPDATE admin_users 
            SET two_factor_enabled = 0, two_factor_secret = NULL 
            WHERE id = ?
        `, [userId]);

        await this.logAudit(userId, '2fa_disabled', {}, null, null);
        return { success: true };
    }
}

module.exports = AuthManager;
