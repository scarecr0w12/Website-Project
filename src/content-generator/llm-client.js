/**
 * Secure LLM API Client with error handling and retry logic
 * Supports OpenAI-compatible APIs
 */

const axios = require('axios');
const config = require('./config');

class LLMClient {
  constructor() {
    this.client = axios.create({
      baseURL: config.llm.apiUrl,
      timeout: config.llm.timeout,
      headers: {
        'Authorization': `Bearer ${config.llm.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ViralContentWebsite/1.0.0'
      }
    });

    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  /**
   * Generate content using the LLM
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} options - Additional options for the request
   * @returns {Promise<string>} The generated content
   */
  async generateContent(prompt, options = {}) {
    const requestData = {
      model: options.model || config.llm.model,
      messages: [
        {
          role: 'system',
          content: 'You are a skilled content creator who writes engaging, viral-worthy articles. Focus on creating content that is informative, entertaining, and likely to be shared.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || config.llm.maxTokens,
      temperature: options.temperature || config.llm.temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    return this.makeRequestWithRetry('/chat/completions', requestData);
  }

  /**
   * Make an API request with exponential backoff retry logic
   * @param {string} endpoint - The API endpoint
   * @param {Object} data - The request data
   * @param {number} attempt - Current attempt number
   * @returns {Promise<string>} The generated content
   */
  async makeRequestWithRetry(endpoint, data, attempt = 1) {
    try {
      console.log(`[LLMClient] Making request to ${endpoint} (attempt ${attempt}/${this.maxRetries + 1})`);
      
      const response = await this.client.post(endpoint, data);
      
      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from LLM API');
      }

      const content = response.data.choices[0].message.content.trim();
      console.log(`[LLMClient] Successfully generated ${content.length} characters of content`);
      
      return content;

    } catch (error) {
      console.error(`[LLMClient] Request failed (attempt ${attempt}):`, error.message);

      // Don't retry on certain error types
      if (this.isNonRetryableError(error)) {
        throw new LLMAPIError(`Non-retryable error: ${error.message}`, error.response?.status);
      }

      // Retry if we haven't exceeded max retries
      if (attempt <= this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[LLMClient] Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
        return this.makeRequestWithRetry(endpoint, data, attempt + 1);
      }

      // All retries exhausted
      throw new LLMAPIError(`Max retries (${this.maxRetries}) exceeded: ${error.message}`, error.response?.status);
    }
  }

  /**
   * Check if an error should not be retried
   * @param {Error} error - The error to check
   * @returns {boolean} True if the error should not be retried
   */
  isNonRetryableError(error) {
    const status = error.response?.status;
    
    // Don't retry on authentication, authorization, or bad request errors
    if (status === 401 || status === 403 || status === 400) {
      return true;
    }

    // Don't retry on invalid API key
    if (error.message.includes('Incorrect API key') || error.message.includes('Invalid API key')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for a specified amount of time
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test the API connection
   * @returns {Promise<boolean>} True if connection is successful
   */
  async testConnection() {
    try {
      await this.generateContent('Test connection. Please respond with "Connection successful."', {
        maxTokens: 50
      });
      return true;
    } catch (error) {
      console.error('[LLMClient] Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get API usage information (if supported by the API)
   * @returns {Promise<Object|null>} Usage information or null if not available
   */
  async getUsageInfo() {
    try {
      // This would depend on the specific API's usage endpoint
      // For now, return null as not all APIs support this
      return null;
    } catch (error) {
      console.warn('[LLMClient] Could not retrieve usage info:', error.message);
      return null;
    }
  }
}

/**
 * Custom error class for LLM API errors
 */
class LLMAPIError extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = 'LLMAPIError';
    this.statusCode = statusCode;
  }
}

module.exports = { LLMClient, LLMAPIError };
