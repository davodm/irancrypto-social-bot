import OpenAI from "openai";
import { getENV, isENV } from "../env.js";

// Supported AI providers
const PROVIDERS = {
  OPENAI: "openai",
  OPENROUTER: "openrouter",
  DEEPSEEK: "deepseek",
  GROQ: "groq",
  TOGETHER: "together",
};

// AI Configuration with enhanced model and provider support (lazy-loaded)
let AI_CONFIG = null;

/**
 * Get the current AI configuration with lazy-loaded environment variables
 * @returns {Object} AI configuration object
 */
function getAIConfig() {
  // Lazy load environment variables only when needed
  if (!AI_CONFIG) {
    AI_CONFIG = {
      maxTokens: 8000,
      temperature: 0.7,
      timeout: 30000,

      // Single model for all AI services
      model: getENV("AI_MODEL", "gpt-4o-mini"),

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

  }

  return AI_CONFIG;
}

// Client cache for different providers
const clientCache = new Map();
let currentProvider = null;

// AI module loaded (configuration will be lazy-loaded when needed)
console.log("🤖 AI Module loaded (lazy configuration)");

/**
 * Validate that if a primary provider is set, its API key exists
 * @throws {Error} When primary provider is set but API key is missing
 */
function validatePrimaryProvider() {
  const config = getAIConfig();
  if (config.primaryProvider) {
    const primaryConfig = config.providers[config.primaryProvider];
    if (!primaryConfig || !primaryConfig.apiKey) {
      const providerKeyMap = {
        [PROVIDERS.OPENAI]: 'OPENAI_API_KEY',
        [PROVIDERS.OPENROUTER]: 'OPENROUTER_API_KEY',
        [PROVIDERS.DEEPSEEK]: 'DEEPSEEK_API_KEY',
        [PROVIDERS.GROQ]: 'GROQ_API_KEY',
        [PROVIDERS.TOGETHER]: 'TOGETHER_API_KEY',
      };

      const requiredKey = providerKeyMap[config.primaryProvider];
      throw new Error(
        `AI_PROVIDER is set to '${config.primaryProvider}' but ${requiredKey} environment variable is not set`
      );
    }
  }
}

/**
 * Get the best available provider based on API key availability and priority
 * Priority: Primary provider (if set) > OpenAI > OpenRouter > DeepSeek > Groq > Together
 */
function getBestAvailableProvider() {
  const config = getAIConfig();

  // Validate primary provider configuration first
  validatePrimaryProvider();

  // If a primary provider is specified and available, use it
  if (config.primaryProvider) {
    return config.primaryProvider;
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
    const providerConfig = config.providers[provider];
    if (providerConfig.apiKey) {
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
  const aiConfig = getAIConfig();
  const config = aiConfig.providers[provider];
  if (!config || !config.apiKey) {
    throw new Error(`Provider ${provider} is not configured or missing API key`);
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    organization: config.organization,
    timeout: aiConfig.timeout,
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
  const aiConfig = getAIConfig();

  // Determine model to use
  const model = options.model || aiConfig.model;

  const config = {
    model: model,
    messages: messages,
    max_tokens: options.maxTokens || aiConfig.maxTokens,
    temperature: options.temperature || aiConfig.temperature,
  };

  try {
    console.log(`🤖 Making AI request to ${currentProvider} with model ${config.model}`);
    const result = await client.chat.completions.create(config);

    // Debug: Log the raw response structure
    console.log("🤖 AI Response received:");
    console.log("  Result exists:", !!result);
    console.log("  Choices exists:", !!result?.choices);
    console.log("  Choices length:", result?.choices?.length || 0);
    if (result?.choices?.[0]) {
      console.log("  First choice exists:", !!result.choices[0]);
      console.log("  Message exists:", !!result.choices[0].message);
      console.log("  Content exists:", !!result.choices[0].message?.content);
      console.log("  Content length:", result.choices[0].message?.content?.length || 0);
      console.log("  Content preview:", result.choices[0].message?.content?.substring(0, 100) || "EMPTY");
    }

    // Validate response
    if (!result || !result.choices || result.choices.length === 0) {
      throw new Error("No response choices received from AI model");
    }

    // Validate response content
    const firstChoice = result.choices[0];

    // Check for truncated response (finish_reason: 'length')
    if (firstChoice.finish_reason === 'length') {
      console.warn("⚠️ AI response was truncated (finish_reason: 'length')");
      console.warn("  This often happens with reasoning models that exhaust tokens on internal reasoning");

      // If there's partial content, we can still try to use it
      if (firstChoice.message?.content && firstChoice.message.content.trim().length > 20) {
        console.warn("  Using partial content (may be incomplete)");
      } else {
        throw new Error("AI response was truncated before producing content. Try increasing maxTokens or using a different model.");
      }
    }

    if (!firstChoice.message || !firstChoice.message.content || firstChoice.message.content.trim().length === 0) {
      console.error("🤖 Content validation failed:");
      console.error("  firstChoice:", firstChoice);
      console.error("  firstChoice.message:", firstChoice.message);
      console.error("  firstChoice.message.content:", firstChoice.message?.content);

      // Provide more helpful error message for reasoning models
      if (firstChoice.message?.reasoning) {
        console.error("  Note: Model has reasoning output but no content - likely a reasoning model that exhausted tokens");
        throw new Error("AI model exhausted tokens on reasoning before generating content. Try a non-reasoning model or increase maxTokens significantly.");
      }

      throw new Error("AI response contains no content");
    }

    return result.choices;
  } catch (error) {
    // Enhanced error handling with provider context
    const providerInfo = currentProvider ? ` (${currentProvider})` : '';

    // Log detailed error information for debugging
    console.error(`🤖 AI Error Details${providerInfo}:`);
    console.error(`  Status: ${error.status || 'unknown'}`);
    console.error(`  Code: ${error.code || 'unknown'}`);
    console.error(`  Type: ${error.type || 'unknown'}`);
    console.error(`  Message: ${error.message || 'unknown'}`);
    if (error.response) {
      console.error(`  Response Status: ${error.response.status}`);
      console.error(`  Response Data:`, error.response.data);
    }

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
    } else if (error.status === 429) {
      throw new Error(`AI rate limit exceeded${providerInfo} (429). Please wait and try again, or check your API usage limits.`);
    } else if (error.status === 401) {
      throw new Error(`AI authentication failed${providerInfo} (401). Please check your API key is valid.`);
    } else if (error.status === 403) {
      throw new Error(`AI access forbidden${providerInfo} (403). Please check your account permissions.`);
    } else if (error.status === 500) {
      throw new Error(`AI service internal error${providerInfo} (500). Please try again later.`);
    } else {
      throw new Error(`AI service error${providerInfo}: ${error.message || 'Unknown error'}`);
    }
  }
}
