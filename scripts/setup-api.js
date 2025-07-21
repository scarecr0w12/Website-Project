#!/usr/bin/env node

/**
 * API Setup Helper
 * Guides users through setting up their API configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔑 API Setup Helper for Viral Content Generator\n');

const envPath = path.join(process.cwd(), '.env');

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('Please copy .env.example to .env first:');
  console.log('cp .env.example .env\n');
  process.exit(1);
}

// Read current .env
const envContent = fs.readFileSync(envPath, 'utf8');

// Check if API key is still placeholder
if (envContent.includes('your_api_key_here')) {
  console.log('🔧 Setup Required\n');
  console.log('Your .env file still has placeholder values. To test with a real API:\n');
  
  console.log('📝 Step 1: Choose your API provider\n');
  
  console.log('🤖 OpenAI (Recommended):');
  console.log('  1. Visit: https://platform.openai.com/api-keys');
  console.log('  2. Create a new API key');
  console.log('  3. Update .env:');
  console.log('     LLM_API_KEY=sk-your-actual-key-here');
  console.log('     LLM_API_URL=https://api.openai.com/v1');
  console.log('     LLM_MODEL=gpt-3.5-turbo\n');
  
  console.log('🏠 Local Ollama:');
  console.log('  1. Install Ollama: https://ollama.ai');
  console.log('  2. Pull a model: ollama pull llama2');
  console.log('  3. Update .env:');
  console.log('     LLM_API_KEY=ollama');
  console.log('     LLM_API_URL=http://localhost:11434/v1');
  console.log('     LLM_MODEL=llama2\n');
  
  console.log('🔄 Other OpenAI-compatible APIs:');
  console.log('  Update LLM_API_URL and LLM_API_KEY accordingly\n');
  
  console.log('📝 Step 2: After updating .env, test with:');
  console.log('npm run generate:content test\n');
  
} else {
  console.log('✅ API key configured! Running system test...\n');
  
  // Import and run test
  const testScript = require('./test-content-generation');
  testScript().then(() => {
    console.log('\n🎯 Ready to generate content!');
    console.log('\nTry these commands:');
    console.log('📝 npm run generate:content single');
    console.log('📚 npm run generate:content topic "artificial intelligence" guides');
    console.log('🔄 npm run generate:content batch 3');
  }).catch(error => {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your API key is valid and has credits');
    console.log('2. Verify the API URL is correct');
    console.log('3. Check your internet connection');
  });
}
