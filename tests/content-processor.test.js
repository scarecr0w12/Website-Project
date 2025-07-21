/**
 * Unit Tests for Content Generation System
 * Tests for Content Processor functionality
 */

const ContentProcessor = require('../src/content-generator/content-processor');

describe('ContentProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new ContentProcessor();
  });

  describe('slug generation', () => {
    test('should generate URL-friendly slugs', () => {
      expect(processor.generateSlug('Hello World')).toBe('hello-world');
      expect(processor.generateSlug('This is a Test!')).toBe('this-is-a-test');
      expect(processor.generateSlug('Special Characters: @#$%')).toBe('special-characters-dollarpercent');
    });

    test('should handle empty strings', () => {
      expect(processor.generateSlug('')).toBe('');
    });

    test('should handle special characters', () => {
      expect(processor.generateSlug('AI & Machine Learning')).toBe('ai-and-machine-learning');
      expect(processor.generateSlug('10 Tips for Success (2025)')).toBe('10-tips-for-success-2025');
    });
  });

  describe('title extraction', () => {
    test('should extract title from markdown header', () => {
      const content = '# This is a Title\n\nThis is content.';
      const title = processor.extractTitle(content, {});
      expect(title).toBe('This is a Title');
    });

    test('should use metadata title when available', () => {
      const content = 'Some content without header';
      const metadata = { title: 'Metadata Title' };
      const title = processor.extractTitle(content, metadata);
      expect(title).toBe('Metadata Title');
    });

    test('should extract from first sentence as fallback', () => {
      const content = 'This is the first sentence. This is the second.';
      const title = processor.extractTitle(content, {});
      expect(title).toBe('This is the first sentence.');
    });
  });

  describe('content cleaning', () => {
    test('should remove extra whitespace', () => {
      const content = 'Line 1\n\n\n\nLine 2   \n   \nLine 3';
      const cleaned = processor.cleanContent(content);
      expect(cleaned).toBe('Line 1\n\nLine 2\n\nLine 3');
    });

    test('should fix spacing issues', () => {
      const content = 'Sentence one.Next sentence';
      const cleaned = processor.cleanContent(content);
      expect(cleaned).toBe('Sentence one. Next sentence');
    });
  });

  describe('excerpt generation', () => {
    test('should generate excerpt within length limit', () => {
      const content = 'This is a short article about testing. It has multiple sentences.';
      const excerpt = processor.generateExcerpt(content, 50);
      expect(excerpt.length).toBeLessThanOrEqual(53); // Allow for ellipsis
    });

    test('should preserve complete sentences when possible', () => {
      const content = 'Short sentence. This is a longer sentence that might be truncated.';
      const excerpt = processor.generateExcerpt(content, 20);
      expect(excerpt).toBe('Short sentence.');
    });

    test('should handle content shorter than limit', () => {
      const content = 'Short content.';
      const excerpt = processor.generateExcerpt(content, 100);
      expect(excerpt).toBe('Short content.');
    });
  });

  describe('word counting', () => {
    test('should count words correctly', () => {
      expect(processor.countWords('Hello world')).toBe(2);
      expect(processor.countWords('This is a test article')).toBe(5);
      expect(processor.countWords('')).toBe(0);
    });

    test('should handle punctuation', () => {
      expect(processor.countWords('Hello, world!')).toBe(2);
      expect(processor.countWords('One-two three')).toBe(3);
    });
  });

  describe('reading time calculation', () => {
    test('should calculate reading time', () => {
      expect(processor.calculateReadingTime(200)).toBe(1); // 200 words = 1 minute
      expect(processor.calculateReadingTime(400)).toBe(2); // 400 words = 2 minutes
      expect(processor.calculateReadingTime(100)).toBe(1); // Minimum 1 minute
    });
  });

  describe('content processing', () => {
    test('should process content successfully', () => {
      const rawContent = '# Test Article\n\nThis is test content with **bold** text.';
      const metadata = { contentType: 'test', topic: 'testing' };
      
      const result = processor.processContent(rawContent, metadata);
      
      expect(result.title).toBe('Test Article');
      expect(result.slug).toBe('test-article');
      expect(result.content).toContain('This is test content');
      expect(result.htmlContent).toContain('<strong>bold</strong>');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.readingTime).toBeGreaterThan(0);
      expect(result.seoData).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('content validation', () => {
    test('should validate valid content', () => {
      const article = {
        title: 'Valid Test Article Title',
        content: 'This is a valid article with sufficient content to pass validation checks. It has multiple sentences and provides value to readers.',
        slug: 'valid-test-article',
        excerpt: 'This is a valid excerpt',
        wordCount: 25
      };

      const validation = processor.validateContent(article);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should catch validation errors', () => {
      const article = {
        title: 'Short', // Too short
        content: 'Too short', // Too short
        slug: '', // Missing
        excerpt: 'Excerpt',
        wordCount: 2
      };

      const validation = processor.validateContent(article);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should provide warnings for SEO issues', () => {
      const longExcerpt = 'This is a very long excerpt that exceeds the recommended 160 character limit for meta descriptions and SEO optimization purposes which should definitely trigger a warning message';
      const article = {
        title: 'This is a very long title that exceeds the recommended 60 character limit for SEO optimization',
        content: 'This is a valid article with sufficient content to pass validation checks.',
        slug: 'valid-slug',
        excerpt: longExcerpt,
        wordCount: 15 // Below recommended
      };

      const validation = processor.validateContent(article);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('Title is longer'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('Excerpt is longer'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('shorter than recommended'))).toBe(true);
    });
  });

  describe('SEO data generation', () => {
    test('should generate comprehensive SEO data', () => {
      const article = {
        title: 'Test Article About Technology',
        content: 'This is content about technology and innovation in the modern world.',
        excerpt: 'Learn about technology and innovation',
        slug: 'test-article-technology',
        metadata: { keywords: ['technology', 'innovation'] }
      };

      const seoData = processor.generateSEOData(article);
      
      expect(seoData.title).toBe(article.title);
      expect(seoData.description).toBe(article.excerpt);
      expect(seoData.keywords).toContain('technology');
      expect(seoData.keywords).toContain('innovation');
      expect(seoData.canonicalUrl).toBe('/articles/test-article-technology');
      expect(seoData.structuredData['@type']).toBe('Article');
    });
  });
});
