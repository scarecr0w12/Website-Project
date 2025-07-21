/**
 * Dynamic Prompt Engineering System
 * Creates varied, high-impact prompts for viral content generation
 */

const config = require('./config');

class PromptGenerator {
  constructor() {
    this.templates = this.loadPromptTemplates();
    this.trendingTopics = this.getDefaultTopics();
  }

  /**
   * Load prompt templates for different content types
   * @returns {Object} Template categories and their prompts
   */
  loadPromptTemplates() {
    return {
      listicles: [
        "Write a compelling listicle titled '{title}' about {topic}. Include {count} items with engaging descriptions. Make it shareable and viral-worthy.",
        "Create an entertaining '{count} Things About {topic}' article that will surprise readers and encourage sharing.",
        "Generate a comprehensive list: '{title}' focusing on {topic}. Each point should be informative yet engaging."
      ],
      
      guides: [
        "Write a comprehensive guide on {topic} titled '{title}'. Make it actionable, valuable, and easy to follow.",
        "Create a step-by-step tutorial about {topic}. Include practical tips and real-world examples.",
        "Generate an ultimate guide to {topic} that beginners and experts alike will find valuable."
      ],
      
      controversial: [
        "Write a thought-provoking article about {topic} with the title '{title}'. Present multiple perspectives while maintaining balance.",
        "Create a discussion-worthy piece on {topic} that challenges common assumptions. Keep it respectful but engaging.",
        "Generate an article that explores the controversial aspects of {topic} in a fair and balanced way."
      ],
      
      news_analysis: [
        "Write an insightful analysis of recent developments in {topic}. Title: '{title}'. Focus on implications and future trends.",
        "Create a comprehensive breakdown of {topic} trends, explaining what this means for readers.",
        "Generate an expert analysis of {topic} that helps readers understand complex issues."
      ],
      
      how_to: [
        "Create a detailed how-to article: '{title}' about {topic}. Include specific steps, tips, and common pitfalls to avoid.",
        "Write a practical guide on {topic} that readers can implement immediately.",
        "Generate a comprehensive tutorial for {topic} with actionable advice and examples."
      ],
      
      opinion: [
        "Write a compelling opinion piece about {topic} with the title '{title}'. Back up your arguments with evidence and examples.",
        "Create a thought-provoking editorial on {topic} that sparks meaningful discussion.",
        "Generate a well-reasoned opinion article about {topic} that presents a unique perspective."
      ]
    };
  }

  /**
   * Get default trending topics
   * @returns {Array} Array of topic objects
   */
  getDefaultTopics() {
    return [
      { name: 'artificial intelligence', keywords: ['AI', 'machine learning', 'automation', 'ChatGPT', 'future of work'] },
      { name: 'technology trends', keywords: ['tech', 'innovation', 'startups', 'digital transformation', 'cybersecurity'] },
      { name: 'health and wellness', keywords: ['fitness', 'mental health', 'nutrition', 'lifestyle', 'self-care'] },
      { name: 'personal finance', keywords: ['investing', 'budgeting', 'cryptocurrency', 'financial freedom', 'side hustles'] },
      { name: 'productivity', keywords: ['time management', 'work-life balance', 'remote work', 'efficiency', 'habits'] },
      { name: 'climate change', keywords: ['sustainability', 'renewable energy', 'environmental protection', 'green technology'] },
      { name: 'social media', keywords: ['digital marketing', 'content creation', 'influencers', 'online presence'] },
      { name: 'entrepreneurship', keywords: ['business ideas', 'startup advice', 'leadership', 'innovation', 'scaling'] }
    ];
  }

  /**
   * Generate a dynamic prompt for content creation
   * @param {Object} options - Options for prompt generation
   * @returns {Object} Generated prompt with metadata
   */
  generatePrompt(options = {}) {
    const contentType = options.contentType || this.selectRandomContentType();
    const topic = options.topic || this.selectRandomTopic();
    const template = this.selectTemplate(contentType);
    
    const promptData = {
      contentType,
      topic: topic.name,
      keywords: topic.keywords,
      template,
      title: this.generateTitle(contentType, topic),
      count: this.generateCount(contentType),
      timestamp: new Date().toISOString()
    };

    const prompt = this.populateTemplate(template, promptData);
    
    return {
      prompt,
      metadata: promptData,
      instructions: this.getContentInstructions(contentType)
    };
  }

  /**
   * Select a random content type
   * @returns {string} Content type
   */
  selectRandomContentType() {
    const types = Object.keys(this.templates);
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Select a random topic
   * @returns {Object} Topic object
   */
  selectRandomTopic() {
    return this.trendingTopics[Math.floor(Math.random() * this.trendingTopics.length)];
  }

  /**
   * Select a template for the given content type
   * @param {string} contentType - Type of content
   * @returns {string} Template string
   */
  selectTemplate(contentType) {
    const templates = this.templates[contentType] || this.templates.guides;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate a compelling title for the content
   * @param {string} contentType - Type of content
   * @param {Object} topic - Topic object
   * @returns {string} Generated title
   */
  generateTitle(contentType, topic) {
    const titleTemplates = {
      listicles: [
        "X Things About {topic} That Will Blow Your Mind",
        "The Ultimate List of {topic} Secrets",
        "X {topic} Hacks That Actually Work",
        "X Surprising Facts About {topic}"
      ],
      guides: [
        "The Complete Guide to {topic}",
        "Master {topic} in X Simple Steps",
        "Everything You Need to Know About {topic}",
        "The Ultimate {topic} Guide for Beginners"
      ],
      controversial: [
        "The Truth About {topic} That No One Talks About",
        "Why Everyone is Wrong About {topic}",
        "The {topic} Debate: What You Need to Know",
        "Unpopular Opinion: The Real Story Behind {topic}"
      ],
      news_analysis: [
        "What the Latest {topic} Developments Mean for You",
        "Breaking Down the {topic} Situation",
        "The {topic} Update That Changes Everything",
        "Why the {topic} News Matters More Than You Think"
      ],
      how_to: [
        "How to Master {topic} in X Days",
        "The Step-by-Step Guide to {topic}",
        "How to Get Started with {topic}",
        "The Beginner's Guide to {topic}"
      ],
      opinion: [
        "Why {topic} is More Important Than Ever",
        "The Case for {topic}",
        "My Take on the {topic} Situation",
        "Why We Need to Talk About {topic}"
      ]
    };

    const templates = titleTemplates[contentType] || titleTemplates.guides;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template.replace('{topic}', this.capitalizeWords(topic.name));
  }

  /**
   * Generate a number for listicles
   * @param {string} contentType - Type of content
   * @returns {number} Number for lists
   */
  generateCount(contentType) {
    if (contentType === 'listicles') {
      const numbers = [5, 7, 10, 15, 20, 25];
      return numbers[Math.floor(Math.random() * numbers.length)];
    }
    return Math.floor(Math.random() * 10) + 3; // 3-12 for other content types
  }

  /**
   * Populate template with actual values
   * @param {string} template - Template string
   * @param {Object} data - Data to populate
   * @returns {string} Populated prompt
   */
  populateTemplate(template, data) {
    return template
      .replace(/{title}/g, data.title)
      .replace(/{topic}/g, data.topic)
      .replace(/{count}/g, data.count)
      .replace(/X/g, data.count);
  }

  /**
   * Get specific instructions for content type
   * @param {string} contentType - Type of content
   * @returns {string} Additional instructions
   */
  getContentInstructions(contentType) {
    const instructions = {
      listicles: "Format as a numbered list. Each item should have a clear heading and 2-3 sentences of explanation. Include an engaging introduction and conclusion.",
      guides: "Structure with clear headings and subheadings. Include actionable steps and practical examples. Add tips and warnings where appropriate.",
      controversial: "Present multiple viewpoints fairly. Use evidence and credible sources. Maintain a respectful tone throughout.",
      news_analysis: "Focus on facts and implications. Provide context and background. Explain complex topics clearly.",
      how_to: "Use numbered steps or clear sections. Include prerequisites and required materials. Add troubleshooting tips.",
      opinion: "Support arguments with evidence. Acknowledge counterpoints. Write in first person when appropriate."
    };

    return instructions[contentType] || instructions.guides;
  }

  /**
   * Capitalize words in a string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalizeWords(str) {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Update trending topics (for future RSS/API integration)
   * @param {Array} newTopics - New trending topics
   */
  updateTrendingTopics(newTopics) {
    this.trendingTopics = newTopics;
    console.log(`[PromptGenerator] Updated trending topics: ${newTopics.length} topics loaded`);
  }

  /**
   * Generate multiple prompts at once
   * @param {number} count - Number of prompts to generate
   * @param {Object} options - Options for generation
   * @returns {Array} Array of prompt objects
   */
  generateMultiplePrompts(count = 5, options = {}) {
    const prompts = [];
    const usedCombinations = new Set();

    for (let i = 0; i < count; i++) {
      let prompt;
      let attempts = 0;
      
      do {
        prompt = this.generatePrompt(options);
        const key = `${prompt.metadata.contentType}-${prompt.metadata.topic}`;
        
        if (!usedCombinations.has(key)) {
          usedCombinations.add(key);
          break;
        }
        
        attempts++;
      } while (attempts < 10); // Prevent infinite loop
      
      prompts.push(prompt);
    }

    return prompts;
  }
}

module.exports = PromptGenerator;
