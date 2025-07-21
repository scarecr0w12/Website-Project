# Viral Content Website

A self-hosted viral content website with AI-powered content generation using OpenAI-compatible LLMs. Built following an adaptive development approach with modular architecture.

## 🎯 Project Vision

Automatically generate "viral" content using an OpenAI-compatible LLM to drive high traffic. The entire system is containerized for easy self-hosting and designed to evolve based on performance data.

## 🏗️ Current Implementation Status

### ✅ **Module A: Content Generation Service (COMPLETED)**
- **✅ Configuration Management**: Secure environment variable handling
- **✅ LLM API Client**: Resilient client with retry logic and error handling  
- **✅ Dynamic Prompt Engineering**: 6 content types with varied templates
- **✅ Content Processing**: SEO-ready formatting with validation
- **✅ Comprehensive Testing**: 19 unit tests covering all functionality
- **✅ Documentation**: Complete guides and API documentation

### 🚧 **Module B: Website Backend (NEXT)**
- Database schema design
- API endpoints for content management
- Content serving infrastructure

### 📋 **Module C: Website Frontend (PLANNED)**
- SEO-optimized page templates
- Responsive design
- Performance optimization

### 🐳 **Module D: Automation & Deployment (PLANNED)**
- Enhanced Docker configuration
- Automated content scheduling
- Production deployment guides

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
# Edit .env with your API key
nano .env
```

### 2. Test Content Generation
```bash
# Test all systems
npm run generate:content test

# Generate sample content (requires API key)
npm run generate:content single
npm run generate:content topic "artificial intelligence" guides
```

### 3. Run Development Server
```bash
npm run dev
# Visit http://localhost:3000
```

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
│   ├── content-generator/     # Module A (COMPLETED)
│   │   ├── config.js         # Configuration management
│   │   ├── llm-client.js     # API client with retry logic
│   │   ├── prompt-generator.js # Dynamic prompt creation
│   │   ├── content-processor.js # Content formatting
│   │   └── index.js          # Main orchestrator
│   ├── backend/              # Module B (NEXT)
│   └── frontend/             # Module C (PLANNED)
├── docs/                     # Documentation
├── tests/                    # Unit tests
├── scripts/                  # Utility scripts
└── generated-content/        # Output directory
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

## 🚀 Next Steps (Phase 2)

1. **Backend API Development** (Module B)
   - Database schema implementation
   - RESTful API endpoints
   - Content management system

2. **Frontend Development** (Module C)
   - SEO-optimized templates
   - Performance optimization
   - Responsive design

3. **Analytics Integration**
   - Performance tracking
   - A/B testing framework
   - Content optimization based on metrics

## 🤝 Contributing

This project follows an adaptive development approach:

1. **Build**: Implement MVP features
2. **Measure**: Track performance and user engagement  
3. **Learn**: Adapt based on real-world data

See project documentation for development guidelines and architecture decisions.

## 📄 License

MIT License - feel free to use this project as a foundation for your own viral content systems.

---

**Current Status**: Module A (Content Generation) completed and tested. Ready to begin Module B (Backend API) implementation.
