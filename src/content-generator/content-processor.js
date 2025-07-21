/**
 * Content Processing & Formatting System
 * Transforms raw LLM output into structured, SEO-ready content
 */

const slugify = require('slugify');
const { marked } = require('marked');

class ContentProcessor {
  constructor() {
    this.setupMarkdownRenderer();
  }

  /**
   * Setup markdown renderer with custom configuration
   */
  setupMarkdownRenderer() {
    marked.setOptions({
      gfm: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: true
    });
  }

  /**
   * Process raw LLM content into structured article format
   * @param {string} rawContent - Raw content from LLM
   * @param {Object} metadata - Metadata from prompt generation
   * @returns {Object} Processed article object
   */
  processContent(rawContent, metadata = {}) {
    try {
      const processed = {
        title: this.extractTitle(rawContent, metadata),
        slug: '',
        excerpt: '',
        content: '',
        htmlContent: '',
        readingTime: 0,
        wordCount: 0,
        seoData: {},
        metadata: {
          ...metadata,
          processedAt: new Date().toISOString(),
          contentType: metadata.contentType || 'article'
        }
      };

      // Clean and structure the content
      processed.content = this.cleanContent(rawContent);
      processed.slug = this.generateSlug(processed.title);
      processed.excerpt = this.generateExcerpt(processed.content);
      processed.htmlContent = this.convertToHTML(processed.content);
      processed.wordCount = this.countWords(processed.content);
      processed.readingTime = this.calculateReadingTime(processed.wordCount);
      processed.seoData = this.generateSEOData(processed);

      return processed;

    } catch (error) {
      console.error('[ContentProcessor] Error processing content:', error);
      throw new Error(`Content processing failed: ${error.message}`);
    }
  }

  /**
   * Extract or generate title from content
   * @param {string} content - Raw content
   * @param {Object} metadata - Content metadata
   * @returns {string} Extracted or generated title
   */
  extractTitle(content, metadata) {
    // Look for title in first line if it starts with #
    const lines = content.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || '';
    
    if (firstLine.startsWith('# ')) {
      return firstLine.replace('# ', '').trim();
    }
    
    // Use metadata title if available
    if (metadata.title) {
      return metadata.title;
    }
    
    // Generate title from first sentence
    const firstSentence = this.extractFirstSentence(content);
    if (firstSentence.length > 10 && firstSentence.length < 100) {
      return firstSentence;
    }
    
    // Fallback title
    return `Untitled Article - ${new Date().toISOString().split('T')[0]}`;
  }

  /**
   * Extract first sentence from content
   * @param {string} content - Content to extract from
   * @returns {string} First sentence
   */
  extractFirstSentence(content) {
    const cleaned = content.replace(/^#+\s*/, ''); // Remove markdown headers
    const match = cleaned.match(/^[^.!?]*[.!?]/);
    return match ? match[0].trim() : '';
  }

  /**
   * Generate URL-friendly slug from title
   * @param {string} title - Article title
   * @returns {string} URL slug
   */
  generateSlug(title) {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@#$%&]/g
    });
  }

  /**
   * Clean and format content
   * @param {string} content - Raw content
   * @returns {string} Cleaned content
   */
  cleanContent(content) {
    return content
      // Remove extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '') // Remove trailing whitespace from lines
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces with single space
      // Fix common formatting issues
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      // Ensure proper line breaks
      .trim();
  }

  /**
   * Generate excerpt from content
   * @param {string} content - Article content
   * @param {number} maxLength - Maximum excerpt length
   * @returns {string} Article excerpt
   */
  generateExcerpt(content, maxLength = 160) {
    // Remove markdown formatting for excerpt
    const plainText = content
      .replace(/#+\s*/g, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/\n+/g, ' ') // Replace line breaks with spaces
      .trim();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    // Find the last complete sentence within the limit
    const truncated = plainText.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    if (lastSentenceEnd > maxLength * 0.6) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    // If no good sentence break, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  /**
   * Convert markdown content to HTML
   * @param {string} content - Markdown content
   * @returns {string} HTML content
   */
  convertToHTML(content) {
    try {
      return marked(content);
    } catch (error) {
      console.error('[ContentProcessor] Markdown conversion error:', error);
      // Fallback: convert basic formatting
      return content
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
    }
  }

  /**
   * Count words in content
   * @param {string} content - Content to count
   * @returns {number} Word count
   */
  countWords(content) {
    return content
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .split(' ')
      .filter(word => word.length > 0)
      .length;
  }

  /**
   * Calculate estimated reading time
   * @param {number} wordCount - Number of words
   * @param {number} wordsPerMinute - Average reading speed
   * @returns {number} Reading time in minutes
   */
  calculateReadingTime(wordCount, wordsPerMinute = 200) {
    return Math.max(1, Math.round(wordCount / wordsPerMinute));
  }

  /**
   * Generate SEO metadata
   * @param {Object} article - Processed article object
   * @returns {Object} SEO data
   */
  generateSEOData(article) {
    return {
      title: this.optimizeTitle(article.title),
      description: article.excerpt,
      keywords: this.extractKeywords(article.content, article.metadata),
      ogTitle: article.title,
      ogDescription: article.excerpt,
      ogType: 'article',
      twitterCard: 'summary_large_image',
      canonicalUrl: `/articles/${article.slug}`,
      structuredData: this.generateStructuredData(article)
    };
  }

  /**
   * Optimize title for SEO
   * @param {string} title - Original title
   * @returns {string} Optimized title
   */
  optimizeTitle(title) {
    // Ensure title is within optimal length (50-60 characters)
    if (title.length <= 60) {
      return title;
    }

    // Try to truncate at word boundary
    const truncated = title.substring(0, 57);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 40 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  /**
   * Extract keywords from content
   * @param {string} content - Article content
   * @param {Object} metadata - Content metadata
   * @returns {Array} Array of keywords
   */
  extractKeywords(content, metadata) {
    const keywords = new Set();

    // Add keywords from metadata
    if (metadata.keywords) {
      metadata.keywords.forEach(keyword => keywords.add(keyword.toLowerCase()));
    }

    // Extract common words from content (simple implementation)
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20);

    // Count word frequency
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Add most frequent words as keywords
    Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([word]) => keywords.add(word));

    return Array.from(keywords).slice(0, 15); // Limit to 15 keywords
  }

  /**
   * Generate structured data for the article
   * @param {Object} article - Processed article
   * @returns {Object} JSON-LD structured data
   */
  generateStructuredData(article) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt,
      wordCount: article.wordCount,
      datePublished: article.metadata.processedAt,
      dateModified: article.metadata.processedAt,
      author: {
        '@type': 'Organization',
        name: 'Viral Content Website'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Viral Content Website'
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `/articles/${article.slug}`
      }
    };
  }

  /**
   * Validate processed content
   * @param {Object} article - Processed article
   * @returns {Object} Validation result
   */
  validateContent(article) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!article.title || article.title.length < 10) {
      errors.push('Title must be at least 10 characters long');
    }

    if (!article.content || article.content.length < 100) {
      errors.push('Content must be at least 100 characters long');
    }

    if (!article.slug) {
      errors.push('Slug is required');
    }

    // SEO recommendations
    if (article.title.length > 60) {
      warnings.push('Title is longer than recommended 60 characters');
    }

    if (article.excerpt.length > 160) {
      warnings.push('Excerpt is longer than recommended 160 characters');
    }

    if (article.wordCount < 300) {
      warnings.push('Article is shorter than recommended 300 words');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = ContentProcessor;
