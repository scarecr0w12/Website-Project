/**
 * Main Content Generator
 * Orchestrates the entire content generation pipeline
 */

const { LLMClient } = require('./llm-client');
const PromptGenerator = require('./prompt-generator');
const ContentProcessor = require('./content-processor');
const config = require('./config');

class ContentGenerator {
  constructor() {
    this.llmClient = new LLMClient();
    this.promptGenerator = new PromptGenerator();
    this.contentProcessor = new ContentProcessor();
    this.isGenerating = false;
  }

  /**
   * Generate a single article
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated article
   */
  async generateArticle(options = {}) {
    if (this.isGenerating && !options.force) {
      throw new Error('Content generation already in progress');
    }

    this.isGenerating = true;

    try {
      console.log('[ContentGenerator] Starting article generation...');

      // Step 1: Generate prompt
      const promptData = this.promptGenerator.generatePrompt(options);
      console.log(`[ContentGenerator] Generated prompt for ${promptData.metadata.contentType} about ${promptData.metadata.topic}`);

      // Step 2: Generate content using LLM
      const rawContent = await this.llmClient.generateContent(
        promptData.prompt + '\n\n' + promptData.instructions,
        options.llmOptions
      );

      // Step 3: Process and format content
      const processedArticle = this.contentProcessor.processContent(rawContent, promptData.metadata);

      // Step 4: Validate content
      const validation = this.contentProcessor.validateContent(processedArticle);
      if (!validation.isValid) {
        console.warn('[ContentGenerator] Content validation failed:', validation.errors);
        // Could implement retry logic here
      }

      console.log(`[ContentGenerator] Successfully generated article: "${processedArticle.title}"`);
      console.log(`[ContentGenerator] Word count: ${processedArticle.wordCount}, Reading time: ${processedArticle.readingTime} min`);

      return {
        article: processedArticle,
        validation,
        generationTime: new Date().toISOString()
      };

    } catch (error) {
      console.error('[ContentGenerator] Article generation failed:', error.message);
      throw error;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate multiple articles
   * @param {number} count - Number of articles to generate
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Array of generated articles
   */
  async generateMultipleArticles(count = 3, options = {}) {
    console.log(`[ContentGenerator] Starting batch generation of ${count} articles...`);

    const results = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        console.log(`[ContentGenerator] Generating article ${i + 1}/${count}...`);
        
        const result = await this.generateArticle({
          ...options,
          force: true // Allow generation even if one is in progress
        });
        
        results.push(result);

        // Add delay between generations to avoid rate limiting
        if (i < count - 1) {
          await this.delay(options.delayBetween || 2000);
        }

      } catch (error) {
        console.error(`[ContentGenerator] Failed to generate article ${i + 1}:`, error.message);
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    console.log(`[ContentGenerator] Batch generation complete. ${results.length}/${count} articles generated successfully.`);

    return {
      articles: results,
      errors,
      totalGenerated: results.length,
      totalRequested: count
    };
  }

  /**
   * Generate article for specific topic
   * @param {string} topic - Topic to write about
   * @param {string} contentType - Type of content to generate
   * @returns {Promise<Object>} Generated article
   */
  async generateTopicArticle(topic, contentType = 'guides') {
    console.log(`[ContentGenerator] Generating ${contentType} article about: ${topic}`);

    return this.generateArticle({
      topic: { name: topic, keywords: [topic] },
      contentType
    });
  }

  /**
   * Test the content generation system
   * @returns {Promise<Object>} Test results
   */
  async testSystem() {
    console.log('[ContentGenerator] Testing content generation system...');

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: LLM Connection
    try {
      const connectionTest = await this.llmClient.testConnection();
      testResults.tests.push({
        name: 'LLM Connection',
        passed: connectionTest,
        message: connectionTest ? 'Connection successful' : 'Connection failed'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'LLM Connection',
        passed: false,
        message: error.message
      });
    }

    // Test 2: Prompt Generation
    try {
      const prompt = this.promptGenerator.generatePrompt();
      testResults.tests.push({
        name: 'Prompt Generation',
        passed: !!prompt.prompt,
        message: prompt.prompt ? `Generated prompt for ${prompt.metadata.contentType}` : 'Failed to generate prompt'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Prompt Generation',
        passed: false,
        message: error.message
      });
    }

    // Test 3: Content Processing
    try {
      const testContent = "# Test Article\n\nThis is a test article content. It has multiple paragraphs.\n\nThis is the second paragraph with some **bold** text.";
      const processed = this.contentProcessor.processContent(testContent, { contentType: 'test' });
      testResults.tests.push({
        name: 'Content Processing',
        passed: !!processed.title && !!processed.slug,
        message: processed.title ? `Processed article: "${processed.title}"` : 'Failed to process content'
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Content Processing',
        passed: false,
        message: error.message
      });
    }

    // Test 4: Full Article Generation (if all other tests pass)
    const allTestsPassed = testResults.tests.every(test => test.passed);
    if (allTestsPassed) {
      try {
        const result = await this.generateArticle({
          topic: { name: 'technology', keywords: ['tech', 'innovation'] },
          contentType: 'guides',
          llmOptions: { maxTokens: 500 } // Shorter for testing
        });

        testResults.tests.push({
          name: 'Full Article Generation',
          passed: !!result.article,
          message: result.article ? `Generated: "${result.article.title}"` : 'Failed to generate article'
        });
      } catch (error) {
        testResults.tests.push({
          name: 'Full Article Generation',
          passed: false,
          message: error.message
        });
      }
    } else {
      testResults.tests.push({
        name: 'Full Article Generation',
        passed: false,
        message: 'Skipped due to previous test failures'
      });
    }

    const passedTests = testResults.tests.filter(test => test.passed).length;
    const totalTests = testResults.tests.length;

    console.log(`[ContentGenerator] System test complete: ${passedTests}/${totalTests} tests passed`);

    return {
      ...testResults,
      summary: {
        passed: passedTests,
        total: totalTests,
        success: passedTests === totalTests
      }
    };
  }

  /**
   * Get system status
   * @returns {Object} Current system status
   */
  getStatus() {
    return {
      isGenerating: this.isGenerating,
      config: {
        contentGenerationEnabled: config.content.generationEnabled,
        maxArticlesPerDay: config.content.maxArticlesPerDay,
        topics: config.content.topics
      },
      llmConfig: {
        model: config.llm.model,
        maxTokens: config.llm.maxTokens,
        temperature: config.llm.temperature
      }
    };
  }

  /**
   * Update system configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    // This would update the configuration
    // For now, just log the change
    console.log('[ContentGenerator] Configuration update requested:', newConfig);
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ContentGenerator;
