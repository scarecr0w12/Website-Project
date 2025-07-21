#!/usr/bin/env node

/**
 * Content Generation with Database Integration
 * Generates content and saves it to the database via API
 */

const ContentGenerator = require('../src/content-generator');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

class ContentManager {
  constructor() {
    this.contentGenerator = new ContentGenerator();
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ContentManager/1.0'
      }
    });
  }

  /**
   * Generate and save content to database
   * @param {string} mode - Generation mode (single, batch, etc.)
   * @param {Object} options - Generation options
   */
  async generateAndSave(mode = 'single', options = {}) {
    try {
      console.log(`🎯 Starting content generation in ${mode} mode...`);

      if (mode === 'single') {
        await this.generateSingleArticle(options);
      } else if (mode === 'batch') {
        await this.generateBatchArticles(options);
      } else if (mode === 'test') {
        await this.testIntegration();
      } else {
        throw new Error(`Unknown mode: ${mode}`);
      }

    } catch (error) {
      console.error('❌ Content generation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate a single article and save to database
   */
  async generateSingleArticle(options = {}) {
    try {
      // Generate article
      console.log('[ContentManager] Generating article...');
      const result = await this.contentGenerator.generateArticle(options);
      
      // Extract the article from the result
      const article = result.article || result;
      
      console.log(`✅ Generated: "${article.title}"`);
      console.log(`📊 Stats: ${article.wordCount} words, ${article.readingTime} min read`);

      // Transform data to match API expectations
      const apiPayload = {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        htmlContent: article.htmlContent,
        wordCount: article.wordCount,
        readingTime: article.readingTime,
        metadata: article.metadata,
        seoData: article.seoData
      };

      // Save to database via API
      console.log('[ContentManager] Saving to database...');
      const response = await this.apiClient.post('/articles', apiPayload);
      
      if (response.data.success) {
        const savedArticle = response.data.data;
        console.log(`✅ Saved to database with ID: ${savedArticle.id}`);
        
        // Also save to local files for backup
        await this.saveToFiles(article);
        
        console.log(`🔗 Article URL: http://localhost:3000/article/${article.slug}`);
        console.log(`📊 API URL: http://localhost:3000/api/v1/articles/${article.slug}`);
        
        return savedArticle;
      } else {
        throw new Error('Failed to save article to database');
      }

    } catch (error) {
      if (error.response) {
        console.error('❌ API Error:', error.response.data.message || error.message);
        if (error.response.data.errors) {
          console.error('Validation errors:', error.response.data.errors);
        }
        if (error.response.status === 409) {
          console.log('💡 Tip: Article with this slug already exists. Try generating another one.');
        }
      } else {
        console.error('❌ Generation Error:', error.message);
      }
      throw error;
    }
  }

  /**
   * Generate multiple articles in batch
   */
  async generateBatchArticles(options = {}) {
    const { count = 5, delay = 2000 } = options;
    
    console.log(`🔄 Generating ${count} articles with ${delay}ms delay between generations...`);
    
    const results = [];
    const errors = [];

    for (let i = 1; i <= count; i++) {
      try {
        console.log(`\n📝 Generating article ${i}/${count}...`);
        const article = await this.generateSingleArticle();
        results.push(article);
        
        if (i < count) {
          console.log(`⏳ Waiting ${delay}ms before next generation...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`❌ Failed to generate article ${i}:`, error.message);
        errors.push({ index: i, error: error.message });
      }
    }

    console.log(`\n📊 Batch Generation Complete:`);
    console.log(`✅ Successful: ${results.length}`);
    console.log(`❌ Failed: ${errors.length}`);
    
    if (results.length > 0) {
      console.log('\n🎉 Successfully generated articles:');
      results.forEach((article, index) => {
        console.log(`  ${index + 1}. ${article.title} (ID: ${article.id})`);
      });
    }

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ index, error }) => {
        console.log(`  Article ${index}: ${error}`);
      });
    }

    return { results, errors };
  }

  /**
   * Test the integration without generating content
   */
  async testIntegration() {
    console.log('🧪 Testing content management integration...');
    
    try {
      // Test API health
      console.log('[Test] 1. Checking API health...');
      const healthResponse = await this.apiClient.get('/health');
      
      if (healthResponse.data.success) {
        console.log('✅ API is healthy');
        console.log(`📊 Database: ${healthResponse.data.database}`);
        console.log(`🕒 Uptime: ${healthResponse.data.uptime}s`);
      } else {
        throw new Error('API health check failed');
      }

      // Test content generator
      console.log('[Test] 2. Testing content generator...');
      const testResult = await this.contentGenerator.test();
      
      if (testResult.success) {
        console.log('✅ Content generator is working');
      } else {
        throw new Error('Content generator test failed');
      }

      // Test database queries
      console.log('[Test] 3. Testing database queries...');
      const articlesResponse = await this.apiClient.get('/articles?limit=5');
      
      if (articlesResponse.data.success) {
        console.log(`✅ Database queries working`);
        console.log(`📚 Found ${articlesResponse.data.pagination.total} existing articles`);
      } else {
        throw new Error('Database query test failed');
      }

      console.log('\n🎉 All integration tests passed!');
      console.log('\n🚀 Ready to generate content:');
      console.log('  npm run content:generate single  # Generate one article');
      console.log('  npm run content:generate batch   # Generate multiple articles');
      
      return true;

    } catch (error) {
      console.error('❌ Integration test failed:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 Make sure the server is running:');
        console.log('  npm run dev  # Start development server');
      }
      
      throw error;
    }
  }

  /**
   * Save article to local files as backup
   */
  async saveToFiles(article) {
    try {
      const outputDir = path.join(process.cwd(), 'generated-content');
      await fs.mkdir(outputDir, { recursive: true });
      
      const jsonPath = path.join(outputDir, `${article.slug}.json`);
      const mdPath = path.join(outputDir, `${article.slug}.md`);
      
      // Save JSON
      await fs.writeFile(jsonPath, JSON.stringify(article, null, 2));
      
      // Save Markdown
      const markdownContent = `# ${article.title}

> ${article.excerpt}

**Word Count:** ${article.wordCount} | **Reading Time:** ${article.readingTime} minutes | **Type:** ${article.metadata?.contentType}

---

${article.content}

---

*Generated on ${new Date(article.metadata.processedAt).toLocaleString()}*
`;
      await fs.writeFile(mdPath, markdownContent);
      
      console.log(`💾 Backup saved: ${path.relative(process.cwd(), jsonPath)}`);
      
    } catch (error) {
      console.warn('⚠️  Failed to save backup files:', error.message);
    }
  }

  /**
   * List recent articles from database
   */
  async listArticles(limit = 10) {
    try {
      const response = await this.apiClient.get(`/articles?limit=${limit}&sortBy=created_at&sortOrder=DESC`);
      
      if (response.data.success) {
        const articles = response.data.data;
        console.log(`📚 Recent Articles (${articles.length}/${response.data.pagination.total}):\n`);
        
        articles.forEach((article, index) => {
          console.log(`${index + 1}. ${article.title}`);
          console.log(`   🔗 ${article.slug}`);
          console.log(`   📊 ${article.word_count} words, ${article.views} views, Score: ${article.performance_score}`);
          console.log(`   📅 ${new Date(article.created_at).toLocaleDateString()}`);
          console.log('');
        });
        
        return articles;
      } else {
        throw new Error('Failed to fetch articles');
      }
      
    } catch (error) {
      console.error('❌ Failed to list articles:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'single';
  const contentManager = new ContentManager();

  try {
    switch (mode) {
      case 'single':
        await contentManager.generateAndSave('single');
        break;
        
      case 'batch':
        const count = parseInt(args[1]) || 3;
        await contentManager.generateAndSave('batch', { count });
        break;
        
      case 'test':
        await contentManager.generateAndSave('test');
        break;
        
      case 'list':
        const limit = parseInt(args[1]) || 10;
        await contentManager.listArticles(limit);
        break;
        
      default:
        console.log('📖 Usage:');
        console.log('  node scripts/content-manager.js single              # Generate one article');
        console.log('  node scripts/content-manager.js batch [count]       # Generate multiple articles');
        console.log('  node scripts/content-manager.js test                # Test integration');
        console.log('  node scripts/content-manager.js list [limit]        # List recent articles');
        break;
    }
  } catch (error) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ContentManager;
