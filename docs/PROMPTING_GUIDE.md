# Prompting Guide - Viral Content Generation

This guide explains how to create, modify, and optimize prompts for the viral content generation system.

## Overview

Effective prompting is crucial for generating high-quality, viral-worthy content. This system uses a dynamic prompting approach that combines:
- Content type templates
- Trending topics
- Dynamic variables
- Specific instructions

## Prompt Structure

Each prompt consists of three main components:

```
[Base Prompt] + [Dynamic Elements] + [Instructions]
```

### Base Prompt
The core template that defines the content type and basic requirements.

### Dynamic Elements
Variables that are populated at runtime:
- `{title}`: Generated title based on content type and topic
- `{topic}`: The main subject/topic
- `{count}`: Number for listicles (5, 7, 10, etc.)
- `{keywords}`: Related keywords for SEO

### Instructions
Specific formatting and quality guidelines for the content type.

## Content Types and Templates

### 1. Listicles
**Goal**: Create engaging, shareable numbered lists

**Templates**:
```
"Write a compelling listicle titled '{title}' about {topic}. Include {count} items with engaging descriptions. Make it shareable and viral-worthy."

"Create an entertaining '{count} Things About {topic}' article that will surprise readers and encourage sharing."
```

**Title Patterns**:
- "X Things About {topic} That Will Blow Your Mind"
- "X {topic} Hacks That Actually Work"
- "X Surprising Facts About {topic}"

**Instructions**: Format as numbered list, engaging intro/conclusion, 2-3 sentences per item.

### 2. Guides
**Goal**: Comprehensive, actionable content that provides real value

**Templates**:
```
"Write a comprehensive guide on {topic} titled '{title}'. Make it actionable, valuable, and easy to follow."

"Create a step-by-step tutorial about {topic}. Include practical tips and real-world examples."
```

**Title Patterns**:
- "The Complete Guide to {topic}"
- "Master {topic} in X Simple Steps"
- "The Ultimate {topic} Guide for Beginners"

**Instructions**: Clear headings, actionable steps, examples, tips and warnings.

### 3. Controversial Content
**Goal**: Spark discussion while maintaining balance and respect

**Templates**:
```
"Write a thought-provoking article about {topic} with the title '{title}'. Present multiple perspectives while maintaining balance."

"Create a discussion-worthy piece on {topic} that challenges common assumptions. Keep it respectful but engaging."
```

**Title Patterns**:
- "The Truth About {topic} That No One Talks About"
- "Why Everyone is Wrong About {topic}"
- "Unpopular Opinion: The Real Story Behind {topic}"

**Instructions**: Multiple viewpoints, evidence-based arguments, respectful tone.

### 4. How-To Content
**Goal**: Practical, implementable instructions

**Templates**:
```
"Create a detailed how-to article: '{title}' about {topic}. Include specific steps, tips, and common pitfalls to avoid."

"Write a practical guide on {topic} that readers can implement immediately."
```

**Title Patterns**:
- "How to Master {topic} in X Days"
- "The Step-by-Step Guide to {topic}"
- "How to Get Started with {topic}"

**Instructions**: Numbered steps, prerequisites, troubleshooting, clear sections.

### 5. Opinion Pieces
**Goal**: Thought-provoking editorial content

**Templates**:
```
"Write a compelling opinion piece about {topic} with the title '{title}'. Back up your arguments with evidence and examples."

"Create a thought-provoking editorial on {topic} that sparks meaningful discussion."
```

**Title Patterns**:
- "Why {topic} is More Important Than Ever"
- "The Case for {topic}"
- "My Take on the {topic} Situation"

**Instructions**: Evidence-based arguments, acknowledge counterpoints, first person appropriate.

### 6. News Analysis
**Goal**: Insightful breakdown of current events

**Templates**:
```
"Write an insightful analysis of recent developments in {topic}. Title: '{title}'. Focus on implications and future trends."

"Create a comprehensive breakdown of {topic} trends, explaining what this means for readers."
```

**Title Patterns**:
- "What the Latest {topic} Developments Mean for You"
- "Breaking Down the {topic} Situation"
- "Why the {topic} News Matters More Than You Think"

**Instructions**: Focus on facts and implications, provide context, explain complex topics clearly.

## Adding New Content Types

### Step 1: Define Templates
Add new templates to the `prompt-generator.js` file:

```javascript
// In loadPromptTemplates() method
newContentType: [
  "Template 1 with {variables}",
  "Template 2 with {variables}",
  "Template 3 with {variables}"
]
```

### Step 2: Create Title Patterns
Add title templates in the `generateTitle()` method:

```javascript
// In titleTemplates object
newContentType: [
  "Title Pattern 1 with {topic}",
  "Title Pattern 2 with {topic}",
  "Title Pattern 3 with {topic}"
]
```

### Step 3: Define Instructions
Add content-specific instructions in the `getContentInstructions()` method:

```javascript
// In instructions object
newContentType: "Specific formatting and quality guidelines for this content type."
```

## Optimizing Prompts for Virality

### 1. Emotional Triggers
- **Curiosity**: "The Secret Behind...", "What Nobody Tells You About..."
- **Surprise**: "Shocking Facts About...", "You Won't Believe..."
- **Authority**: "Expert Reveals...", "Industry Insider Shares..."
- **Urgency**: "The Latest...", "Breaking News About..."

### 2. Numbers and Specificity
- Use specific numbers: "7 Ways" vs "Several Ways"
- Odd numbers often perform better: 5, 7, 9, 11
- Round numbers for larger lists: 20, 25, 50

### 3. Action Words
- Power verbs: "Master", "Transform", "Discover", "Unlock"
- Achievement words: "Ultimate", "Complete", "Essential", "Proven"

### 4. Target Audience
- Beginner-friendly: "Beginner's Guide", "Getting Started"
- Advanced content: "Advanced Techniques", "Pro Tips"
- Universal appeal: "Everyone Should Know", "Essential for All"

## Topic Selection and Trending Keywords

### High-Performing Topics
1. **Technology**: AI, automation, future trends
2. **Health & Wellness**: Mental health, fitness, nutrition
3. **Finance**: Investing, side hustles, financial freedom
4. **Productivity**: Time management, work-life balance
5. **Self-Improvement**: Habits, goal setting, success

### Keyword Integration
- Use trending keywords naturally in titles
- Include related terms in content
- Balance SEO optimization with readability

### Seasonal Content
- Holiday-related topics
- New Year resolutions
- Back-to-school content
- Industry-specific seasons (tax season, etc.)

## Quality Guidelines

### Content Length
- **Listicles**: 800-1500 words
- **Guides**: 1500-3000 words
- **How-To**: 1000-2000 words
- **Opinion**: 800-1500 words
- **News Analysis**: 1000-1800 words

### Structure Requirements
1. **Compelling headline**
2. **Engaging introduction** (hook + preview)
3. **Clear main content** (structured sections)
4. **Actionable takeaways**
5. **Strong conclusion** (summary + call-to-action)

### SEO Optimization
- Target keyword in title and first paragraph
- Use header tags (H2, H3) for structure
- Include related keywords naturally
- Optimize meta description (under 160 characters)

## Testing and Iteration

### A/B Testing Prompts
1. Create variations of the same prompt
2. Generate content with each variation
3. Compare engagement metrics
4. Refine based on performance data

### Performance Metrics
- **Engagement**: Comments, shares, time on page
- **SEO**: Search rankings, organic traffic
- **Conversion**: Newsletter signups, clicks
- **Viral Potential**: Social media shares

### Continuous Improvement
1. Monitor content performance
2. Identify patterns in successful content
3. Update prompt templates based on data
4. Test new content types and formats

## Advanced Techniques

### Prompt Chaining
Combine multiple prompts for complex content:
1. Generate outline with first prompt
2. Expand sections with follow-up prompts
3. Polish and optimize with final prompt

### Dynamic Context
- Incorporate current events
- Reference trending topics
- Add seasonal relevance
- Include industry-specific terminology

### Content Variations
Generate multiple versions:
- Different angles on same topic
- Varying levels of complexity
- Alternative formats (list vs prose)
- Different target audiences

## Troubleshooting Common Issues

### Generic Content
**Problem**: Content lacks specificity and personality
**Solution**: 
- Add more specific context to prompts
- Include industry jargon or terminology
- Request specific examples and case studies

### Off-Topic Content
**Problem**: LLM generates content that doesn't match the topic
**Solution**:
- Make topic requirements more explicit
- Add negative examples (what NOT to include)
- Use more specific keyword constraints

### Poor Structure
**Problem**: Content lacks clear organization
**Solution**:
- Specify required sections in prompt
- Request specific formatting (headers, bullets)
- Include structural examples in prompt

### Low Engagement Potential
**Problem**: Content is informative but not shareable
**Solution**:
- Emphasize viral elements in prompt
- Request emotional hooks and cliffhangers
- Include shareability requirements

## Best Practices

1. **Be Specific**: Detailed prompts produce better results
2. **Include Examples**: Show the desired format when possible
3. **Set Constraints**: Specify word count, structure, tone
4. **Test Regularly**: Monitor and adjust based on performance
5. **Stay Current**: Update topics and keywords regularly
6. **Maintain Quality**: Always review and edit generated content
7. **Consider Audience**: Tailor prompts to target demographics
8. **Optimize for Platform**: Consider where content will be shared

## Prompt Templates Library

### Template Categories
- **Beginner-Friendly**: Simple language, basic concepts
- **Advanced**: Complex topics, industry terminology
- **Trending**: Current events, viral topics
- **Evergreen**: Timeless content, long-term value
- **Seasonal**: Holiday, seasonal, time-sensitive content

### Customization Variables
- `{difficulty_level}`: beginner, intermediate, advanced
- `{tone}`: casual, professional, conversational, authoritative
- `{length}`: short, medium, comprehensive
- `{urgency}`: immediate, trending, timeless
- `{audience}`: professionals, students, general public

This guide serves as a foundation for creating effective prompts. Regular testing and optimization based on performance data will help refine the prompting strategy over time.
