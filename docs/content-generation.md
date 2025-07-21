# Content Generation Service Documentation

This document describes the Content Generation Service (Module A) - the "brain" of the viral content website system.

## Overview

The Content Generation Service is responsible for:
- Securely managing API connections to OpenAI-compatible LLMs
- Generating varied, high-impact prompts for viral content
- Processing and formatting raw LLM output into SEO-ready content

## Architecture

```
Content Generation Pipeline:
Prompt Generator → LLM Client → Content Processor → Structured Article
```

## Components

### 1. Configuration Manager (`config.js`)
Manages all environment variables and application settings.

**Environment Variables Required:**
- `LLM_API_KEY`: Your OpenAI or compatible API key
- `LLM_API_URL`: API endpoint (default: https://api.openai.com/v1)
- `LLM_MODEL`: Model to use (default: gpt-3.5-turbo)
- `LLM_MAX_TOKENS`: Maximum tokens per request (default: 1500)
- `LLM_TEMPERATURE`: Creativity level 0-1 (default: 0.7)

**Optional Settings:**
- `CONTENT_TOPICS`: Comma-separated list of topics
- `MAX_ARTICLES_PER_DAY`: Daily generation limit
- `CONTENT_GENERATION_INTERVAL`: Time between generations (ms)

### 2. LLM Client (`llm-client.js`)
Secure API client with retry logic and error handling.

**Features:**
- Exponential backoff retry logic
- Rate limiting protection
- Error classification (retryable vs non-retryable)
- Connection testing
- Timeout handling

**Usage:**
```javascript
const { LLMClient } = require('./llm-client');
const client = new LLMClient();

// Generate content
const content = await client.generateContent(prompt);

// Test connection
const isConnected = await client.testConnection();
```

### 3. Prompt Generator (`prompt-generator.js`)
Creates varied, high-impact prompts for different content types.

**Content Types Supported:**
- `listicles`: Numbered lists and rankings
- `guides`: Comprehensive how-to content
- `controversial`: Discussion-worthy topics
- `news_analysis`: Current events analysis
- `how_to`: Step-by-step tutorials
- `opinion`: Editorial content

**Usage:**
```javascript
const PromptGenerator = require('./prompt-generator');
const generator = new PromptGenerator();

// Generate random prompt
const prompt = generator.generatePrompt();

// Generate specific type
const guidePrompt = generator.generatePrompt({
  contentType: 'guides',
  topic: { name: 'productivity', keywords: ['efficiency', 'time management'] }
});

// Generate multiple prompts
const prompts = generator.generateMultiplePrompts(5);
```

### 4. Content Processor (`content-processor.js`)
Transforms raw LLM output into structured, SEO-ready content.

**Processing Steps:**
1. Extract/generate title
2. Clean and format content
3. Generate URL slug
4. Create excerpt
5. Convert to HTML
6. Calculate reading time
7. Generate SEO metadata
8. Validate content

**Output Format:**
```javascript
{
  title: "Article Title",
  slug: "article-title",
  excerpt: "Brief description...",
  content: "Markdown content",
  htmlContent: "<p>HTML content</p>",
  wordCount: 1200,
  readingTime: 6,
  seoData: {
    title: "SEO optimized title",
    description: "Meta description",
    keywords: ["keyword1", "keyword2"],
    structuredData: { /* JSON-LD */ }
  },
  metadata: {
    contentType: "guides",
    topic: "productivity",
    processedAt: "2025-07-20T12:00:00Z"
  }
}
```

### 5. Main Content Generator (`index.js`)
Orchestrates the entire content generation pipeline.

**Main Methods:**
- `generateArticle(options)`: Generate single article
- `generateMultipleArticles(count, options)`: Batch generation
- `generateTopicArticle(topic, contentType)`: Topic-specific generation
- `testSystem()`: System health check

## Setup Instructions

### 1. Environment Configuration
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 2. Required Environment Variables
```env
LLM_API_KEY=your_openai_api_key_here
LLM_API_URL=https://api.openai.com/v1
LLM_MODEL=gpt-3.5-turbo
```

### 3. Test the System
```bash
# Run system tests
npm run generate:content test

# Or use the test script
node scripts/test-content-generation.js
```

## Usage Examples

### Generate Single Article
```bash
npm run generate:content single
npm run generate:content single guides "artificial intelligence"
```

### Generate Multiple Articles
```bash
npm run generate:content batch 5
```

### Generate Topic-Specific Article
```bash
npm run generate:content topic "productivity tips" how_to
```

### Programmatic Usage
```javascript
const ContentGenerator = require('./src/content-generator');

const generator = new ContentGenerator();

// Generate article
const result = await generator.generateArticle({
  contentType: 'listicles',
  topic: { name: 'technology', keywords: ['AI', 'innovation'] }
});

console.log(result.article.title);
```

## Error Handling

The system includes comprehensive error handling:

### LLM API Errors
- **401/403**: Authentication/authorization errors (non-retryable)
- **429**: Rate limiting (retryable with exponential backoff)
- **500/502/503**: Server errors (retryable)
- **Timeout**: Network timeouts (retryable)

### Content Processing Errors
- **Validation errors**: Invalid content format
- **Processing errors**: Markdown conversion issues
- **SEO errors**: Missing required metadata

### Recovery Strategies
1. **Retry Logic**: Automatic retries with exponential backoff
2. **Fallback Content**: Default templates when generation fails
3. **Graceful Degradation**: Continue operation with reduced functionality

## Performance Considerations

### Rate Limiting
- Built-in delays between API calls
- Configurable rate limits
- Automatic backoff on rate limit errors

### Content Quality
- Validation checks for minimum content length
- SEO optimization for titles and descriptions
- Keyword extraction and optimization

### Monitoring
- Generation success/failure tracking
- Performance metrics (response time, word count)
- Error logging and alerting

## Extension Points

### Adding New Content Types
1. Add templates to `prompt-generator.js`
2. Add title templates for the new type
3. Add content instructions
4. Update validation rules if needed

### Custom LLM Providers
1. Extend `LLMClient` class
2. Implement provider-specific authentication
3. Handle provider-specific response formats
4. Add provider-specific error handling

### Content Post-Processing
1. Add image generation integration
2. Implement content enhancement (links, formatting)
3. Add social media optimization
4. Integrate fact-checking services

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Check `.env` file exists and has correct API key
   - Verify API key has sufficient credits/permissions

2. **Connection Timeouts**
   - Check internet connection
   - Verify API endpoint URL
   - Increase timeout in configuration

3. **Content Generation Fails**
   - Run system test to identify specific component failure
   - Check logs for detailed error messages
   - Verify all dependencies are installed

4. **Low Quality Content**
   - Adjust temperature setting (lower = more focused)
   - Modify prompt templates for better instructions
   - Increase max_tokens for longer content

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
```

This will provide detailed logs of the generation process.

## Security Considerations

1. **API Key Protection**: Never commit API keys to version control
2. **Rate Limiting**: Respect API provider rate limits
3. **Input Validation**: Sanitize all user inputs
4. **Output Filtering**: Review generated content for inappropriate material
5. **Access Control**: Limit who can trigger content generation

## Future Enhancements

1. **RSS Feed Integration**: Automatic trending topic detection
2. **Content Scheduling**: Automated content publishing
3. **A/B Testing**: Multiple content variations
4. **Analytics Integration**: Performance-based content optimization
5. **Multi-language Support**: Content generation in multiple languages
