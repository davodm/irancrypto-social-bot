import OpenAI from "openai";
import { getENV, isENV } from "./env.js";

// Supported AI providers
const PROVIDERS = {
  OPENAI: "openai",
  OPENROUTER: "openrouter",
  DEEPSEEK: "deepseek",
  GROQ: "groq",
  TOGETHER: "together",
};

// AI Configuration with enhanced model and provider support
const AI_CONFIG = {
  maxTokens: 8000,
  temperature: 0.7,
  timeout: 30000,

  // Single model for all AI services
  model: getENV("OPENAI_MODEL", "gpt-4o-mini"),

  // Primary provider override (optional)
  primaryProvider: getENV("AI_PROVIDER", null), // Can be: openai, openrouter, deepseek, groq, together

  // Provider-specific configurations
  providers: {
    [PROVIDERS.OPENAI]: {
      baseURL: "https://api.openai.com/v1",
      apiKey: getENV("OPENAI_API_KEY", null),
      organization: getENV("OPENAI_ORGANIZATION", null),
      defaultHeaders: {},
    },
    [PROVIDERS.OPENROUTER]: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: getENV("OPENROUTER_API_KEY", null),
      organization: null,
      defaultHeaders: {
        "HTTP-Referer": "https://irancrypto.market",
        "X-Title": "IranCrypto.market",
        "X-Description": "Iran's leading cryptocurrency monitoring platform",
      },
    },
    [PROVIDERS.DEEPSEEK]: {
      baseURL: "https://api.deepseek.com/v1",
      apiKey: getENV("DEEPSEEK_API_KEY", null),
      organization: null,
      defaultHeaders: {},
    },
    [PROVIDERS.GROQ]: {
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: getENV("GROQ_API_KEY", null),
      organization: null,
      defaultHeaders: {},
    },
    [PROVIDERS.TOGETHER]: {
      baseURL: "https://api.together.xyz/v1",
      apiKey: getENV("TOGETHER_API_KEY", null),
      organization: null,
      defaultHeaders: {},
    },
  },
};

// Client cache for different providers
const clientCache = new Map();
let currentProvider = null;

/**
 * Get the best available provider based on API key availability and priority
 * Priority: Primary provider (if set) > OpenAI > OpenRouter > DeepSeek > Groq > Together
 */
function getBestAvailableProvider() {
  // If a primary provider is specified and available, use it
  if (AI_CONFIG.primaryProvider) {
    const primaryConfig = AI_CONFIG.providers[AI_CONFIG.primaryProvider];
    if (primaryConfig && primaryConfig.apiKey) {
      return AI_CONFIG.primaryProvider;
    }
  }

  // Default priority order
  const priority = [
    PROVIDERS.OPENAI,
    PROVIDERS.OPENROUTER,
    PROVIDERS.DEEPSEEK,
    PROVIDERS.GROQ,
    PROVIDERS.TOGETHER,
  ];

  for (const provider of priority) {
    const config = AI_CONFIG.providers[provider];
    if (config.apiKey) {
      return provider;
    }
  }

  return null;
}

/**
 * Create an OpenAI-compatible client for a specific provider
 * @param {string} provider - Provider name
 * @returns {OpenAI} OpenAI client instance
 */
function createClient(provider) {
  const config = AI_CONFIG.providers[provider];
  if (!config || !config.apiKey) {
    throw new Error(`Provider ${provider} is not configured or missing API key`);
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    organization: config.organization,
    timeout: AI_CONFIG.timeout,
    defaultHeaders: config.defaultHeaders,
  });
}

/**
 * Get or create an AI client for the specified provider
 * @param {string} provider - Provider name (optional, uses best available if not specified)
 * @returns {OpenAI} OpenAI client instance
 */
function getAIClient(provider = null) {
  const targetProvider = provider || getBestAvailableProvider();

  if (!targetProvider) {
    throw new Error(
      "No valid AI API credentials found. Please set at least one of: OPENAI_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY, GROQ_API_KEY, or TOGETHER_API_KEY"
    );
  }

  if (!clientCache.has(targetProvider)) {
    try {
      clientCache.set(targetProvider, createClient(targetProvider));
    } catch (error) {
      throw new Error(`Failed to initialize ${targetProvider} client: ${error.message}`);
    }
  }

  currentProvider = targetProvider;
  return clientCache.get(targetProvider);
}


// Don't initialize the client immediately - wait until it's needed
// This ensures environment variables are loaded first

/**
 * Utility function to clean and format AI responses
 * @param {string} content - Raw AI response content
 * @returns {string} Cleaned and formatted content
 */
function cleanAIResponse(content) {
  if (!content || typeof content !== "string") {
    return "";
  }

  // Remove unnecessary quotes from beginning and end
  content = content.trim();
  if (
    (content.startsWith('"') && content.endsWith('"')) ||
    (content.startsWith("'") && content.endsWith("'"))
  ) {
    content = content.slice(1, -1);
  }

  // Remove markdown formatting that doesn't work well on social media
  content = content.replace(/\*\*(.*?)\*\*/g, "$1"); // Remove bold
  content = content.replace(/\*(.*?)\*/g, "$1"); // Remove italic
  content = content.replace(/`(.*?)`/g, "$1"); // Remove code formatting

  // Normalize line breaks
  content = content.replace(/\\r\\n/g, "\r\n");
  content = content.replace(/\\n/g, "\n");

  // Remove excessive whitespace
  content = content.replace(/\n{3,}/g, "\n\n"); // Max 2 consecutive newlines
  content = content.replace(/[ \t]{2,}/g, " "); // Remove multiple spaces/tabs

  // Trim again after cleaning
  return content.trim();
}
/**
 * Ask a question from the AI model with improved error handling and validation
 * @param {Array<{role: string, content: string}>} messages - Array of message objects
 * @param {Object} options - Optional configuration overrides
 * @param {string} options.model - Model to use (overrides default)
 * @param {string} options.provider - Provider to use (overrides auto-selection)
 * @param {number} options.temperature - Temperature setting (0-2)
 * @param {number} options.maxTokens - Maximum tokens in response
 * @returns {Promise<Array>} Array of choice objects from the AI response
 * @throws {Error} When no valid response is received or API fails
 */
export async function ask(messages, options = {}) {
  // Input validation
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Messages must be a non-empty array");
  }

  // Validate message format
  for (const message of messages) {
    if (!message.role || !message.content) {
      throw new Error("Each message must have 'role' and 'content' properties");
    }
    if (!["system", "user", "assistant"].includes(message.role)) {
      throw new Error("Message role must be 'system', 'user', or 'assistant'");
    }
  }

  // Get client for specified or best available provider
  const client = getAIClient(options.provider);

  // Determine model to use
  const model = options.model || AI_CONFIG.model;

  const config = {
    model: model,
    messages: messages,
    max_tokens: options.maxTokens || AI_CONFIG.maxTokens,
    temperature: options.temperature || AI_CONFIG.temperature,
  };

  try {
    const result = await client.chat.completions.create(config);

    // Validate response
    if (!result || !result.choices || result.choices.length === 0) {
      throw new Error("No response choices received from AI model");
    }

    // Additional validation for response quality
    const firstChoice = result.choices[0];
    if (!firstChoice.message || !firstChoice.message.content) {
      throw new Error("AI response contains no content");
    }

    return result.choices;
  } catch (error) {
    // Enhanced error handling with provider context
    const providerInfo = currentProvider ? ` (${currentProvider})` : '';

    if (error.code === "insufficient_quota") {
      throw new Error(`AI service${providerInfo} quota exceeded. Please check your billing or try a different provider.`);
    } else if (error.code === "model_not_found") {
      throw new Error(
        `AI model '${config.model}' not found${providerInfo}. Please check model availability or try a different model/provider.`
      );
    } else if (error.code === "invalid_request_error") {
      throw new Error(`Invalid AI request${providerInfo}: ${error.message}`);
    } else if (error.code === "authentication_error") {
      throw new Error(`AI authentication failed${providerInfo}. Please check your API key.`);
    } else if (error.code === "rate_limit_exceeded") {
      throw new Error(`AI rate limit exceeded${providerInfo}. Please try again later.`);
    } else {
      throw new Error(`AI service error${providerInfo}: ${error.message}`);
    }
  }
}

/**
 * Generate engaging tweet templates with optimized prompts for cryptocurrency content
 * @param {string} subject - The subject or prompt for the tweet
 * @param {Object} options - Optional configuration
 * @param {number} options.maxLength - Maximum tweet length (default: 280)
 * @param {string} options.tone - Tone of the tweet (professional, casual, excited)
 * @param {boolean} options.includeHashtags - Whether to include hashtags
 * @returns {Promise<string|null>} Generated tweet template or null if failed
 */
export async function writeTweet(subject, options = {}) {
  // Input validation
  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    throw new Error("Subject must be a non-empty string");
  }

  const config = {
    maxLength: options.maxLength || 280,
    tone: options.tone || "professional",
    includeHashtags: options.includeHashtags !== false, // default true
  };

  const systemPrompt = `You are an expert cryptocurrency content creator and social media specialist for IranCrypto.market, Iran's leading cryptocurrency trading platform.

MISSION: Create engaging, informative Twitter content about cryptocurrency trends, trading volumes, and market insights specifically for the Iranian crypto community.

GUIDELINES:
1. **Length**: Keep tweets under ${
    config.maxLength
  } characters (current limit: 280)
2. **Tone**: ${config.tone} yet accessible to both beginners and experts
3. **Format**: Use placeholder variables like %1%, %2%, etc. for dynamic data insertion
4. **Structure**: For lists, use numbered format with line breaks (\\r\\n)
5. **Hashtags**: ${
    config.includeHashtags
      ? "Include 2-3 relevant hashtags"
      : "No hashtags needed"
  }
6. **Currency**: Always mention IRR (Iranian Rial) for local relevance
7. **Engagement**: End with a question or call-to-action when appropriate

STYLE REQUIREMENTS:
- Use emojis sparingly but effectively (📈, 💰, 🚀)
- Avoid crypto jargon; explain when necessary
- Focus on actionable insights
- Create urgency without being pushy
- Maintain credibility and trust

CONTENT FOCUS:
- Trading volumes and market movements
- Top performing cryptocurrencies in Iran
- Market trends and analysis
- Educational content about crypto trading
- Community engagement and discussions

Remember: You're writing for Iranian crypto traders who value both profit opportunities and market education.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: subject },
  ];

  try {
    const result = await ask(messages, {
      temperature: 0.8, // Higher creativity for social media content
      maxTokens: 1000, // Appropriate for tweet length
    });

    if (!result || result.length === 0) {
      return null;
    }

    let content = result[0].message.content;

    // Clean up response formatting
    content = cleanAIResponse(content);





    return content;
  } catch (error) {
    console.warn(`Failed to generate tweet: ${error.message}`);
    return null;
  }
}

/**
 * Generate compelling Instagram captions optimized for cryptocurrency content
 * @param {string} subject - The subject or prompt for the Instagram caption
 * @param {Object} options - Optional configuration
 * @param {number} options.maxHashtags - Maximum number of hashtags (default: 5)
 * @param {string} options.style - Caption style (professional, casual, educational)
 * @param {boolean} options.includeCall2Action - Whether to include call-to-action
 * @returns {Promise<string|null>} Generated Instagram caption or null if failed
 */
export async function writeCaption(subject, options = {}) {
  // Input validation
  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    throw new Error("Subject must be a non-empty string");
  }

  const config = {
    maxHashtags: options.maxHashtags || 5,
    style: options.style || "professional",
    includeCall2Action: options.includeCall2Action !== false, // default true
  };

  const systemPrompt = `You are a senior content marketing specialist and cryptocurrency expert creating Instagram content for IranCrypto.market, Iran's premier cryptocurrency trading platform.

MISSION: Create compelling, educational Instagram captions that build community, drive engagement, and establish thought leadership in the Iranian cryptocurrency space.

CONTENT STRATEGY:
1. **Hook**: Start with an attention-grabbing opening line
2. **Value**: Provide actionable insights or educational content
3. **Context**: Explain significance for Iranian crypto traders
4. **Engagement**: ${
    config.includeCall2Action
      ? "Include call-to-action or question"
      : "Focus on information delivery"
  }

CAPTION STRUCTURE:
- Opening hook (1-2 lines)
- Main content with insights/data
- Context or educational element
- ${
    config.includeCall2Action
      ? "Call-to-action or engagement question"
      : "Thought-provoking conclusion"
  }
- Strategic hashtags (maximum ${config.maxHashtags})

STYLE GUIDELINES:
- **Tone**: ${config.style} yet accessible and engaging
- **Length**: 150-300 words for optimal engagement
- **Formatting**: Use line breaks for readability
- **Emojis**: Use strategically (📊, 💎, 🇮🇷, 📈, 💰)
- **Language**: Clear, jargon-free explanations

HASHTAG STRATEGY:
- Mix of trending crypto hashtags
- Iran-specific cryptocurrency tags
- Community and educational hashtags
- Brand-relevant hashtags
- Limit to ${config.maxHashtags} most impactful tags

TARGET AUDIENCE:
- Iranian cryptocurrency traders and investors
- Crypto enthusiasts seeking market insights
- Financial technology professionals
- Individuals learning about cryptocurrency

CONTENT FOCUS:
- Market analysis and trends
- Educational cryptocurrency content
- Trading insights and tips
- Community achievements and milestones
- Technology explanations and benefits

Remember: Instagram favors authentic, valuable content that sparks conversation and builds community trust.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: subject },
  ];

  try {
    const result = await ask(messages, {
      temperature: 0.75, // Balanced creativity for Instagram content
      maxTokens: 1500, // Appropriate for Instagram captions
    });

    if (!result || result.length === 0) {
      return null;
    }

    let content = result[0].message.content;

    // Clean up response formatting
    content = cleanAIResponse(content);





    return content;
  } catch (error) {
    console.warn(`Failed to generate caption: ${error.message}`);
    return null;
  }
}

/**
 * Estimate token count for content (rough approximation)
 * @param {string} content - Text content to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokenCount(content) {
  // Handle edge cases
  if (!content || typeof content !== "string") {
    return 0;
  }

  // Rough estimation: 1 token ≈ 4 characters for English text
  // Adjusting for potential unicode characters in Persian/Farsi content
  return Math.ceil(content.length / 3.5);
}
