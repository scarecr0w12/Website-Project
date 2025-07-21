#!/usr/bin/env node

/**
 * Manual Content Generation Script
 * Allows manual generation of articles for testing and content creation
 */

const ContentGenerator = require('../src/content-generator');
const fs = require('fs').promises;
const path = require('path');

async function generateContent() {
  console.log('📝 Viral Content Generator\n');

  const generator = new ContentGenerator();

  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'single';

    switch (command) {
      case 'single':
        await generateSingleArticle(generator, args);
        break;
      case 'batch':
        await generateBatchArticles(generator, args);
        break;
      case 'topic':
        await generateTopicArticle(generator, args);
        break;
      case 'test':
        await testSystem(generator);
        break;
      default:
        showUsage();
    }

  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}

async function generateSingleArticle(generator, args) {
  console.log('🎯 Generating single article...\n');

  const contentType = args[1] || null;
  const topic = args[2] || null;

  const options = {};
  if (contentType) options.contentType = contentType;
  if (topic) options.topic = { name: topic, keywords: [topic] };

  const result = await generator.generateArticle(options);
  
  console.log('✅ Article generated successfully!\n');
  console.log(`📰 Title: ${result.article.title}`);
  console.log(`🏷️  Type: ${result.article.metadata.contentType}`);
  console.log(`📊 Words: ${result.article.wordCount}`);
  console.log(`⏱️  Reading time: ${result.article.readingTime} minutes`);
  console.log(`🔗 Slug: ${result.article.slug}\n`);

  // Save to file
  await saveArticle(result.article);
}

async function generateBatchArticles(generator, args) {
  const count = parseInt(args[1]) || 3;
  console.log(`📚 Generating ${count} articles...\n`);

  const result = await generator.generateMultipleArticles(count);
  
  console.log(`✅ Batch generation complete!`);
  console.log(`📈 Generated: ${result.totalGenerated}/${result.totalRequested} articles\n`);

  for (const articleResult of result.articles) {
    console.log(`📰 "${articleResult.article.title}" (${articleResult.article.wordCount} words)`);
    await saveArticle(articleResult.article);
  }

  if (result.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    result.errors.forEach(error => {
      console.log(`❌ Article ${error.index + 1}: ${error.error}`);
    });
  }
}

async function generateTopicArticle(generator, args) {
  const topic = args[1];
  const contentType = args[2] || 'guides';

  if (!topic) {
    console.log('❌ Please specify a topic: npm run generate:content topic "your topic"');
    return;
  }

  console.log(`🎯 Generating ${contentType} article about: ${topic}\n`);

  const result = await generator.generateTopicArticle(topic, contentType);
  
  console.log('✅ Topic article generated successfully!\n');
  console.log(`📰 Title: ${result.article.title}`);
  console.log(`📊 Words: ${result.article.wordCount}`);
  console.log(`⏱️  Reading time: ${result.article.readingTime} minutes\n`);

  await saveArticle(result.article);
}

async function testSystem(generator) {
  console.log('🧪 Testing content generation system...\n');

  const testResults = await generator.testSystem();
  
  console.log('📊 Test Results:');
  testResults.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.message}`);
  });

  console.log(`\n📈 Summary: ${testResults.summary.passed}/${testResults.summary.total} tests passed`);
}

async function saveArticle(article) {
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'generated-content');
    await fs.mkdir(outputDir, { recursive: true });

    // Save as JSON
    const jsonPath = path.join(outputDir, `${article.slug}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(article, null, 2));

    // Save as Markdown
    const mdPath = path.join(outputDir, `${article.slug}.md`);
    const markdownContent = `# ${article.title}

> ${article.excerpt}

**Word Count:** ${article.wordCount} | **Reading Time:** ${article.readingTime} minutes

---

${article.content}

---

*Generated on ${new Date(article.metadata.processedAt).toLocaleString()}*
*Type: ${article.metadata.contentType}*
`;
    await fs.writeFile(mdPath, markdownContent);

    console.log(`💾 Saved to: ${path.relative(process.cwd(), jsonPath)}`);
    console.log(`📄 Markdown: ${path.relative(process.cwd(), mdPath)}`);
  } catch (error) {
    console.error('⚠️  Failed to save article:', error.message);
  }
}

function showUsage() {
  console.log(`
Usage: npm run generate:content [command] [options]

Commands:
  single [type] [topic]     Generate a single article
  batch [count]            Generate multiple articles (default: 3)
  topic [topic] [type]     Generate article about specific topic
  test                     Test the generation system

Content Types:
  listicles, guides, controversial, news_analysis, how_to, opinion

Examples:
  npm run generate:content single
  npm run generate:content single guides "artificial intelligence"
  npm run generate:content batch 5
  npm run generate:content topic "productivity tips" how_to
  npm run generate:content test
`);
}

// Run if called directly
if (require.main === module) {
  generateContent().catch(console.error);
}

module.exports = generateContent;
