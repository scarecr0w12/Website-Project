#!/usr/bin/env node

/**
 * InsightHub Automated Backup System
 * Handles database backups, content backups, and cleanup
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BackupManager {
    constructor() {
        this.config = {
            backupDir: './backups',
            retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
            compressionEnabled: process.env.BACKUP_COMPRESSION !== 'false',
            remoteBackupEnabled: process.env.REMOTE_BACKUP_ENABLED === 'true',
            remoteBackupPath: process.env.REMOTE_BACKUP_PATH || '',
            
            paths: {
                database: './data/articles.db',
                content: './generated-content',
                logs: './logs',
                config: './.env'
            }
        };
        
        this.initialize();
    }
    
    async initialize() {
        // Ensure backup directory exists
        try {
            await fs.mkdir(this.config.backupDir, { recursive: true });
            console.log('📁 Backup directory initialized');
        } catch (error) {
            console.error('❌ Failed to create backup directory:', error.message);
            process.exit(1);
        }
    }
    
    async log(message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        
        console.log(logEntry);
        
        try {
            await fs.appendFile(
                path.join(this.config.backupDir, 'backup.log'),
                logEntry + (Object.keys(data).length ? ` - ${JSON.stringify(data)}` : '') + '\n'
            );
        } catch (error) {
            console.error('Failed to write backup log:', error.message);
        }
    }
    
    async checkDiskSpace() {
        try {
            const { stdout } = await execAsync('df . | tail -1 | awk \'{print $4}\'');
            const availableKB = parseInt(stdout.trim());
            const availableMB = Math.floor(availableKB / 1024);
            
            await this.log(`💾 Available disk space: ${availableMB}MB`);
            
            if (availableMB < 1000) { // Less than 1GB
                await this.log('⚠️  WARNING: Low disk space for backups');
                return false;
            }
            
            return true;
        } catch (error) {
            await this.log('❌ Failed to check disk space', { error: error.message });
            return true; // Continue anyway
        }
    }
    
    async backupDatabase() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.config.backupDir, `database-${timestamp}.db`);
        
        try {
            // Check if database exists
            await fs.access(this.config.paths.database);
            
            // Create backup
            await fs.copyFile(this.config.paths.database, backupFile);
            
            const stats = await fs.stat(backupFile);
            await this.log(`✅ Database backup created: ${path.basename(backupFile)} (${Math.round(stats.size / 1024)}KB)`);
            
            // Compress if enabled
            if (this.config.compressionEnabled) {
                const compressedFile = `${backupFile}.gz`;
                await execAsync(`gzip "${backupFile}"`);
                await this.log(`🗜️  Database backup compressed: ${path.basename(compressedFile)}`);
                return compressedFile;
            }
            
            return backupFile;
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.log('ℹ️  No database file found, skipping database backup');
                return null;
            }
            
            await this.log('❌ Database backup failed', { error: error.message });
            throw error;
        }
    }
    
    async backupContent() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.config.backupDir, `content-${timestamp}.tar.gz`);
        
        try {
            // Check if content directory exists
            await fs.access(this.config.paths.content);
            
            // Create tar.gz archive
            await execAsync(`tar -czf "${backupFile}" -C "${path.dirname(this.config.paths.content)}" "${path.basename(this.config.paths.content)}"`);
            
            const stats = await fs.stat(backupFile);
            await this.log(`✅ Content backup created: ${path.basename(backupFile)} (${Math.round(stats.size / 1024)}KB)`);
            
            return backupFile;
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.log('ℹ️  No content directory found, skipping content backup');
                return null;
            }
            
            await this.log('❌ Content backup failed', { error: error.message });
            throw error;
        }
    }
    
    async backupLogs() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.config.backupDir, `logs-${timestamp}.tar.gz`);
        
        try {
            // Check if logs directory exists and has content
            const logFiles = await fs.readdir(this.config.paths.logs);
            if (logFiles.length === 0) {
                await this.log('ℹ️  No log files found, skipping logs backup');
                return null;
            }
            
            // Create tar.gz archive
            await execAsync(`tar -czf "${backupFile}" -C "${path.dirname(this.config.paths.logs)}" "${path.basename(this.config.paths.logs)}"`);
            
            const stats = await fs.stat(backupFile);
            await this.log(`✅ Logs backup created: ${path.basename(backupFile)} (${Math.round(stats.size / 1024)}KB)`);
            
            return backupFile;
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.log('ℹ️  No logs directory found, skipping logs backup');
                return null;
            }
            
            await this.log('❌ Logs backup failed', { error: error.message });
            return null; // Non-critical failure
        }
    }
    
    async cleanupOldBackups() {
        try {
            const files = await fs.readdir(this.config.backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
            
            let deletedCount = 0;
            let deletedSize = 0;
            
            for (const file of files) {
                const filePath = path.join(this.config.backupDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.isFile() && stats.mtime < cutoffDate && file !== 'backup.log') {
                    await fs.unlink(filePath);
                    deletedCount++;
                    deletedSize += stats.size;
                }
            }
            
            if (deletedCount > 0) {
                await this.log(`🧹 Cleaned up ${deletedCount} old backup files (${Math.round(deletedSize / 1024 / 1024)}MB freed)`);
            }
        } catch (error) {
            await this.log('❌ Backup cleanup failed', { error: error.message });
        }
    }
    
    async uploadToRemote(filePath) {
        if (!this.config.remoteBackupEnabled || !this.config.remoteBackupPath) {
            return;
        }
        
        try {
            // This is a placeholder for remote backup functionality
            // You could implement:
            // - AWS S3 upload
            // - rsync to remote server
            // - FTP/SFTP upload
            // - Cloud storage APIs
            
            await this.log(`📤 Would upload ${path.basename(filePath)} to remote location`);
            // await execAsync(`aws s3 cp "${filePath}" "${this.config.remoteBackupPath}"`);
            // await this.log(`✅ Remote backup uploaded: ${path.basename(filePath)}`);
        } catch (error) {
            await this.log('❌ Remote backup failed', { error: error.message });
        }
    }
    
    async createFullBackup() {
        const startTime = Date.now();
        await this.log('🚀 Starting full backup...');
        
        // Check disk space
        const hasSpace = await this.checkDiskSpace();
        if (!hasSpace) {
            await this.log('❌ Backup aborted due to insufficient disk space');
            return false;
        }
        
        const backupFiles = [];
        
        try {
            // Backup database
            const dbBackup = await this.backupDatabase();
            if (dbBackup) {
                backupFiles.push(dbBackup);
                await this.uploadToRemote(dbBackup);
            }
            
            // Backup content
            const contentBackup = await this.backupContent();
            if (contentBackup) {
                backupFiles.push(contentBackup);
                await this.uploadToRemote(contentBackup);
            }
            
            // Backup logs
            const logsBackup = await this.backupLogs();
            if (logsBackup) {
                backupFiles.push(logsBackup);
                await this.uploadToRemote(logsBackup);
            }
            
            // Cleanup old backups
            await this.cleanupOldBackups();
            
            const duration = Math.round((Date.now() - startTime) / 1000);
            await this.log(`✅ Full backup completed in ${duration}s (${backupFiles.length} files created)`);
            
            return true;
        } catch (error) {
            await this.log('❌ Full backup failed', { error: error.message });
            return false;
        }
    }
    
    async restoreDatabase(backupFile) {
        try {
            // Validate backup file
            await fs.access(backupFile);
            
            // Create backup of current database
            const currentTime = new Date().toISOString().replace(/[:.]/g, '-');
            const currentBackup = `${this.config.paths.database}.pre-restore-${currentTime}`;
            
            try {
                await fs.copyFile(this.config.paths.database, currentBackup);
                await this.log(`📋 Current database backed up to: ${currentBackup}`);
            } catch (error) {
                // Current database might not exist
            }
            
            // Handle compressed backups
            let sourceFile = backupFile;
            if (backupFile.endsWith('.gz')) {
                const uncompressed = backupFile.replace('.gz', '');
                await execAsync(`gunzip -c "${backupFile}" > "${uncompressed}"`);
                sourceFile = uncompressed;
            }
            
            // Restore database
            await fs.copyFile(sourceFile, this.config.paths.database);
            
            await this.log(`✅ Database restored from: ${path.basename(backupFile)}`);
            return true;
        } catch (error) {
            await this.log('❌ Database restore failed', { error: error.message });
            return false;
        }
    }
    
    async listBackups() {
        try {
            const files = await fs.readdir(this.config.backupDir);
            const backupFiles = [];
            
            for (const file of files) {
                if (file === 'backup.log') continue;
                
                const filePath = path.join(this.config.backupDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.isFile()) {
                    backupFiles.push({
                        name: file,
                        size: Math.round(stats.size / 1024) + 'KB',
                        created: stats.mtime.toISOString(),
                        age: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) + ' days'
                    });
                }
            }
            
            // Sort by creation date (newest first)
            backupFiles.sort((a, b) => new Date(b.created) - new Date(a.created));
            
            console.log('\n📋 Available Backups:');
            console.table(backupFiles);
            
            return backupFiles;
        } catch (error) {
            await this.log('❌ Failed to list backups', { error: error.message });
            return [];
        }
    }
}

// CLI interface
if (require.main === module) {
    const backup = new BackupManager();
    const command = process.argv[2] || 'full';
    
    switch (command) {
        case 'full':
        case 'create':
            backup.createFullBackup();
            break;
        case 'database':
        case 'db':
            backup.backupDatabase();
            break;
        case 'content':
            backup.backupContent();
            break;
        case 'logs':
            backup.backupLogs();
            break;
        case 'cleanup':
            backup.cleanupOldBackups();
            break;
        case 'list':
            backup.listBackups();
            break;
        case 'restore':
            if (process.argv[3]) {
                backup.restoreDatabase(process.argv[3]);
            } else {
                console.log('Usage: node backup.js restore <backup-file>');
            }
            break;
        default:
            console.log(`
InsightHub Backup Manager

Usage: node backup.js [command]

Commands:
  full        Create full backup (database + content + logs)
  database    Backup database only
  content     Backup generated content
  logs        Backup log files
  cleanup     Remove old backup files
  list        List available backups
  restore     Restore database from backup file

Examples:
  node backup.js full
  node backup.js restore ./backups/database-2024-01-01.db
            `);
            break;
    }
}

module.exports = BackupManager;
