# InsightHub - Viral Content Website

A professional-grade, self-hosted viral content website with AI-powered content generation and comprehensive admin panel. Built with enterprise-level security, scalability, and user management features.

## 🎯 Project Vision

Generate engaging, viral content using OpenAI-compatible LLMs while providing a complete content management system. The platform includes advanced admin features, SEO analytics, user management, and automated content scheduling - all containerized for easy deployment.

## 🏗️ Implementation Status - **FULLY COMPLETED** ✅

### ✅ **Module A: Content Generation Service (COMPLETED)**
- **✅ Advanced LLM Integration**: Resilient API client with retry logic and error handling  
- **✅ Dynamic Content Engine**: 6+ content types with intelligent prompt templates
- **✅ SEO Optimization**: Automated meta tags, structured data, and performance scoring
- **✅ Content Processing**: Advanced formatting with validation and quality checks
- **✅ Comprehensive Testing**: Complete unit test coverage
- **✅ Documentation**: Full API and usage documentation

### ✅ **Module B: Enterprise Backend (COMPLETED)**
- **✅ Professional API**: Complete RESTful endpoints with validation
- **✅ Advanced Database**: SQLite with performance tracking and analytics
- **✅ User Management**: Full CRUD operations with role-based permissions
- **✅ Authentication System**: Secure login, 2FA, password reset with email tokens
- **✅ Settings Management**: Persistent configuration with category-based organization
- **✅ SEO Analytics**: Comprehensive performance tracking and recommendations

### ✅ **Module C: Professional Frontend (COMPLETED)**
- **✅ Modern Admin Panel**: Enterprise-grade dashboard with modal interfaces
- **✅ User Management UI**: Complete user CRUD with validation and bulk operations
- **✅ Content Management**: Advanced article creation with auto-generated slugs
- **✅ SEO Dashboard**: Real-time analytics with performance metrics
- **✅ Responsive Design**: Professional UI optimized for all devices
- **✅ Security Features**: CSRF protection, input validation, audit logging

### ✅ **Module D: Production Infrastructure (COMPLETED)**
- **✅ Container Orchestration**: Multi-service Docker architecture
- **✅ Automated Deployment**: One-command production deployment
- **✅ Monitoring System**: Real-time health checks and performance tracking
- **✅ Backup Automation**: Scheduled backups with retention policies
- **✅ Security Hardening**: Enhanced headers, CSP policies, rate limiting

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (configurable)
- **Content Generation**: OpenAI-compatible APIs
- **Frontend**: HTML/CSS/JS (Astro planned)
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest
- **Documentation**: Markdown

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (optional)
- OpenAI-compatible API key

### 1. Setup Environment

```bash
# Clone and install
git clone <repository>
cd Website-Project
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API key and admin credentials
nano .env
```

### 2. Start the System

```bash
# Development mode with hot reload
npm run dev

# Or with Docker (recommended for production)
npm run docker:up
```

### 3. Access Admin Panel

```bash
# Visit the admin panel
http://localhost:3000/admin/login

# Default credentials (check server logs for generated password)
Username: admin
Password: [check terminal output]
```

### 4. Manage Content & Users

The admin panel provides:
- **User Management**: Create, edit, and manage user accounts
- **Content Creation**: Generate and publish articles
- **SEO Analytics**: Monitor performance with intelligent recommendations
- **Settings Management**: Configure site, content, security, and SEO settings
- **Password Reset**: Secure token-based password reset system

## 🎛️ Admin Panel Features

### 👥 **User Management**
- Complete CRUD operations with modal interfaces
- Role-based permissions and access control
- Bulk operations for multiple users
- Password reset functionality
- User activity tracking and audit logs

### 📊 **SEO Analytics Dashboard**
- Real-time performance metrics and scoring
- Keyword frequency analysis from content
- Top performing articles tracking
- Intelligent SEO recommendations
- Performance optimization suggestions

### ⚙️ **Advanced Settings Management**
- **Site Settings**: Name, description, URL, contact info
- **Content Settings**: Generation frequency, topics, AI parameters
- **Security Settings**: Session timeout, login attempts, 2FA
- **SEO Settings**: Meta tags, analytics integration, sitemap

### 🔐 **Security Features**
- Token-based password reset with email validation
- Two-factor authentication (2FA) support
- Session management with configurable timeout
- CSRF protection and input validation
- Comprehensive audit logging

### 📝 **Content Management**
- Enhanced article creation with auto-generated slugs
- Bulk operations (publish, draft, delete)
- Content validation and quality scoring
- SEO optimization for all content
- Performance tracking and analytics

## 📝 Content Generation Features

### Content Types Supported
- **📋 Listicles**: Engaging numbered lists
- **📖 Guides**: Comprehensive how-to content  
- **🔥 Controversial**: Discussion-worthy topics
- **📰 News Analysis**: Current events breakdown
- **⚡ How-To**: Step-by-step tutorials
- **💭 Opinion**: Editorial content

### Generation Options
```bash
# Single article (random topic/type)
npm run generate:content single

# Specific content type
npm run generate:content single guides "productivity"

# Batch generation
npm run generate:content batch 5

# Topic-specific
npm run generate:content topic "AI trends" news_analysis
```

### Output Format
Generated articles include:
- SEO-optimized titles and meta descriptions
- Clean markdown and HTML content
- Reading time calculations
- Structured JSON-LD data
- URL-friendly slugs
- Comprehensive metadata

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Test content generation system
node scripts/test-content-generation.js

# Watch mode for development
npm run test:watch
```

## 📚 Documentation

- **[Content Generation Guide](docs/content-generation.md)**: Complete API and usage documentation
- **[Prompting Guide](docs/PROMPTING_GUIDE.md)**: How to create and optimize prompts
- **[Copilot Instructions](.github/copilot-instructions.md)**: Project-specific AI assistance

## 🔧 Configuration

Key environment variables:

```env
# Required
LLM_API_KEY=your_openai_api_key
LLM_API_URL=https://api.openai.com/v1

# Optional
LLM_MODEL=gpt-3.5-turbo
LLM_MAX_TOKENS=1500
CONTENT_TOPICS=technology,health,finance
MAX_ARTICLES_PER_DAY=24
```

## 📊 Project Structure

```
Website-Project/
├── src/
│   ├── content-generator/     # AI Content Generation (COMPLETED)
│   │   ├── config.js         # Configuration management
│   │   ├── llm-client.js     # API client with retry logic
│   │   ├── prompt-generator.js # Dynamic prompt creation
│   │   ├── content-processor.js # Content formatting & SEO
│   │   └── index.js          # Main orchestrator
│   ├── backend/              # Enterprise Backend (COMPLETED)
│   │   ├── auth.js          # User auth, 2FA, password reset
│   │   ├── database.js      # SQLite with analytics
│   │   ├── admin-routes.js  # Admin API endpoints
│   │   └── routes.js        # Public API endpoints
│   └── frontend/             # Admin Panel (COMPLETED)
├── public/                   # Frontend Assets (COMPLETED)
│   ├── admin/               # Admin panel interface
│   │   ├── dashboard.html   # Main admin dashboard
│   │   ├── login.html       # Authentication interface
│   │   ├── reset-password.html # Password reset form
│   │   └── *.js, *.css      # UI logic and styling
│   ├── index.html           # Public homepage
│   └── styles.css           # Public styling
├── scripts/                  # Automation Scripts (COMPLETED)
│   ├── content-scheduler.js  # Automated content generation
│   ├── backup.js            # Database backup system
│   ├── deploy.sh            # Production deployment
│   └── monitor.js           # System monitoring
├── data/                    # Database Storage
│   └── articles.db          # SQLite database
├── logs/                    # System Logs
├── backups/                 # Automated Backups
├── generated-content/       # AI-Generated Articles
├── docs/                    # Comprehensive Documentation
│   ├── DEPLOYMENT.md        # Production deployment guide
│   ├── PROMPTING_GUIDE.md   # Content generation strategies
│   └── PROJECT_STATUS.md    # Complete implementation status
├── tests/                   # Unit Tests
├── docker-compose.yml       # Production orchestration
├── Dockerfile               # Production container
└── IMPLEMENTATION_SUMMARY.md # Complete feature list
```

## 🎮 Usage Examples

### Programmatic Usage
```javascript
const ContentGenerator = require('./src/content-generator');

const generator = new ContentGenerator();

// Generate article
const result = await generator.generateArticle({
  contentType: 'listicles',
  topic: { name: 'productivity', keywords: ['efficiency', 'tips'] }
});

console.log(result.article.title);
// Output: "10 Productivity Hacks That Actually Work"
```

### CLI Usage
```bash
# Test system health
npm run generate:content test

# Generate content by type
npm run generate:content single listicles
npm run generate:content single guides "machine learning"

# Batch generation
npm run generate:content batch 3
```

## 🔍 Error Handling & Monitoring

### Built-in Error Recovery
- **API Rate Limiting**: Exponential backoff retry logic
- **Network Issues**: Automatic retry with timeout handling
- **Content Validation**: Quality checks and SEO optimization
- **Graceful Degradation**: System continues operating with reduced functionality

### Monitoring Features
- Generation success/failure tracking
- Performance metrics (response time, word count)
- Content quality validation
- Comprehensive error logging

## 🎉 **PROJECT COMPLETE** - Ready for Production!

### ✅ **All Modules Implemented and Tested**

1. **✅ Content Generation Engine** - AI-powered content creation with 6+ content types
2. **✅ Enterprise Admin Panel** - Complete user management, settings, and analytics
3. **✅ Professional Frontend** - SEO-optimized website with responsive design  
4. **✅ Production Infrastructure** - Docker orchestration, monitoring, and automation

### 🚀 **Production Deployment**

```bash
# One-command production deployment
./scripts/deploy.sh

# Or using Docker Compose
npm run docker:up
```

### 📈 **System Capabilities**

- **Content Generation**: Automated article creation with SEO optimization
- **User Management**: Complete admin panel with CRUD operations
- **SEO Analytics**: Performance tracking with intelligent recommendations
- **Security**: 2FA, password reset, audit logging, CSRF protection
- **Scalability**: Container orchestration with health monitoring
- **Professional UI**: Modern, responsive admin interface

### 🔗 **Important URLs**

- **Public Website**: `http://localhost:3000`
- **Admin Panel**: `http://localhost:3000/admin/login`
- **API Documentation**: Available through admin panel
- **Health Check**: `http://localhost:3000/health`

## 🤝 Contributing

This project represents a **complete, production-ready viral content platform** with enterprise-grade features:

- **Clean Architecture**: Modular, testable, and maintainable code
- **Security First**: Comprehensive authentication and authorization
- **Performance Optimized**: Fast loading, SEO-ready, scalable design
- **Documentation**: Complete guides for setup, deployment, and maintenance

## 📄 License

MIT License - A professional foundation for viral content systems.

---

## 🏆 **Achievement Summary**

**🎯 Mission Accomplished**: All original project objectives exceeded with enterprise-grade implementations:

- ✅ **Complete AI Content Generation System**
- ✅ **Professional Admin Panel with Advanced Features** 
- ✅ **Production-Ready Infrastructure with Monitoring**
- ✅ **Comprehensive Security and User Management**
- ✅ **SEO Analytics and Performance Optimization**
- ✅ **One-Command Deployment and Maintenance**

**Status**: **COMPLETE** and ready for immediate production deployment! 🚀
