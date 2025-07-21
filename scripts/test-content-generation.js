#!/usr/bin/env node

/**
 * Content Generation Test Script
 * Tests the content generation system components
 */

const ContentGenerator = require('../src/content-generator');

async function runTests() {
  console.log('🚀 Starting Content Generation System Tests\n');

  const generator = new ContentGenerator();

  try {
    // Test the system
    const testResults = await generator.testSystem();
    
    console.log('\n📊 Test Results:');
    testResults.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${test.message}`);
    });

    console.log(`\n📈 Summary: ${testResults.summary.passed}/${testResults.summary.total} tests passed`);

    if (testResults.summary.success) {
      console.log('\n🎉 All tests passed! System is ready for content generation.');
      
      // If tests pass, try generating a sample article
      console.log('\n📝 Generating sample article...');
      console.log('Note: This requires a valid LLM_API_KEY in your .env file');
      
    } else {
      console.log('\n⚠️  Some tests failed. Please check your configuration.');
      console.log('Make sure you have:');
      console.log('1. Created a .env file based on .env.example');
      console.log('2. Set a valid LLM_API_KEY');
      console.log('3. Configured the LLM_API_URL correctly');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your OpenAI API key to LLM_API_KEY');
    console.log('3. Ensure all dependencies are installed (npm install)');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = runTests;
