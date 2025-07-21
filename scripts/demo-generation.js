#!/usr/bin/env node

/**
 * Demo Content Generation
 * Simulates content generation for testing without requiring API keys
 */

async function runDemo() {
  console.log('🎭 Demo Mode: Content Generation Without API\n');
  
  try {
    // Import only the content processor (doesn't need API)
    const ContentProcessor = require('../src/content-generator/content-processor');
    const processor = new ContentProcessor();

    // Simulate prompt generation manually
    console.log('📝 Sample Prompts Generated:\n');
    
    const samplePrompts = [
      {
        contentType: 'listicles',
        topic: 'productivity',
        title: '10 Productivity Hacks That Actually Work',
        prompt: 'Write a compelling listicle about productivity hacks...'
      },
      {
        contentType: 'guides', 
        topic: 'artificial intelligence',
        title: 'The Complete Guide to AI in 2025',
        prompt: 'Write a comprehensive guide on AI trends...'
      },
      {
        contentType: 'how_to',
        topic: 'content creation',
        title: 'How to Create Viral Content in 5 Steps',
        prompt: 'Create a step-by-step guide for viral content...'
      }
    ];
    
    samplePrompts.forEach((prompt, index) => {
      console.log(`🎯 Prompt ${index + 1}: ${prompt.contentType.toUpperCase()}`);
      console.log(`📋 Topic: ${prompt.topic}`);
      console.log(`📰 Title: ${prompt.title}`);
      console.log('');
    });

    // Simulate content processing with sample content
    console.log('🔄 Processing sample content...\n');
    
    const sampleContent = `# The Future of Artificial Intelligence in 2025

Artificial intelligence has rapidly transformed from science fiction to an integral part of our daily lives. As we progress through 2025, AI continues to revolutionize industries and reshape how we work, communicate, and solve complex problems.

## Key Developments This Year

**1. Enhanced Natural Language Processing**
Large language models have become more sophisticated, offering better understanding of context and nuance in human communication.

**2. AI in Healthcare**
Machine learning algorithms are now assisting doctors in early disease detection and personalized treatment plans.

**3. Autonomous Systems**
Self-driving vehicles and autonomous drones are becoming more reliable and widespread.

## Looking Ahead

The future of AI promises even more exciting developments. From creative AI that can compose music and write stories to AI systems that can solve climate change challenges, the possibilities are endless.

As we embrace these technological advances, it's crucial to ensure that AI development remains ethical, transparent, and beneficial for all of humanity.

## Conclusion

AI in 2025 represents a pivotal moment in human history. By embracing these technologies responsibly, we can create a future that benefits everyone.`;

    const metadata = {
      contentType: 'guides',
      topic: 'artificial intelligence',
      keywords: ['AI', 'technology', 'future', 'machine learning']
    };

    const processedArticle = processor.processContent(sampleContent, metadata);
    
    console.log('✅ Sample Article Generated!\n');
    console.log(`📰 Title: ${processedArticle.title}`);
    console.log(`🔗 Slug: ${processedArticle.slug}`);
    console.log(`📊 Word Count: ${processedArticle.wordCount}`);
    console.log(`⏱️  Reading Time: ${processedArticle.readingTime} minutes`);
    console.log(`📝 Excerpt: ${processedArticle.excerpt}`);
    console.log(`🔍 SEO Keywords: ${processedArticle.seoData.keywords.slice(0, 5).join(', ')}`);
    
    // Validate the content
    const validation = processor.validateContent(processedArticle);
    console.log(`\n✅ Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:', validation.warnings.join(', '));
    }

    // Save the demo content
    const fs = require('fs').promises;
    const path = require('path');
    
    const outputDir = path.join(process.cwd(), 'generated-content');
    await fs.mkdir(outputDir, { recursive: true });
    
    const demoPath = path.join(outputDir, 'demo-article.json');
    await fs.writeFile(demoPath, JSON.stringify(processedArticle, null, 2));
    
    const mdPath = path.join(outputDir, 'demo-article.md');
    const markdownContent = `# ${processedArticle.title}

> ${processedArticle.excerpt}

**Word Count:** ${processedArticle.wordCount} | **Reading Time:** ${processedArticle.readingTime} minutes

---

${processedArticle.content}

---

*Generated on ${new Date(processedArticle.metadata.processedAt).toLocaleString()}*
*Type: ${processedArticle.metadata.contentType}*
`;
    await fs.writeFile(mdPath, markdownContent);
    
    console.log(`\n💾 Demo article saved to:`);
    console.log(`   📄 JSON: ${path.relative(process.cwd(), demoPath)}`);
    console.log(`   📝 Markdown: ${path.relative(process.cwd(), mdPath)}`);
    
    console.log('\n🎉 Demo Complete! The content processing system is working perfectly.');
    console.log('\n🚀 To test with a real LLM API:');
    console.log('1. 🔑 Get an API key from:');
    console.log('   • OpenAI: https://platform.openai.com/api-keys');
    console.log('   • Anthropic: https://console.anthropic.com/');
    console.log('   • Or set up local Ollama: https://ollama.ai');
    console.log('2. 📝 Update your .env file:');
    console.log('   LLM_API_KEY=your-actual-api-key');
    console.log('   LLM_API_URL=https://api.openai.com/v1');
    console.log('3. 🧪 Test: npm run generate:content test');
    console.log('4. 🚀 Generate: npm run generate:content single');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run demo if called directly
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = runDemo;
