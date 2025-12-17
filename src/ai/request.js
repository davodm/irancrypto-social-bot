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

// AI Configuration with enhanced model and provider support
const AI_CONFIG = {
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

// Client cache for different providers
const clientCache = new Map();
let currentProvider = null;

// Validate primary provider configuration on module load
validatePrimaryProvider();

/**
 * Validate that if a primary provider is set, its API key exists
 * @throws {Error} When primary provider is set but API key is missing
 */
function validatePrimaryProvider() {
  if (AI_CONFIG.primaryProvider) {
    const primaryConfig = AI_CONFIG.providers[AI_CONFIG.primaryProvider];
    if (!primaryConfig || !primaryConfig.apiKey) {
      const providerKeyMap = {
        [PROVIDERS.OPENAI]: 'OPENAI_API_KEY',
        [PROVIDERS.OPENROUTER]: 'OPENROUTER_API_KEY',
        [PROVIDERS.DEEPSEEK]: 'DEEPSEEK_API_KEY',
        [PROVIDERS.GROQ]: 'GROQ_API_KEY',
        [PROVIDERS.TOGETHER]: 'TOGETHER_API_KEY',
      };

      const requiredKey = providerKeyMap[AI_CONFIG.primaryProvider];
      throw new Error(
        `AI_PROVIDER is set to '${AI_CONFIG.primaryProvider}' but ${requiredKey} environment variable is not set`
      );
    }
  }
}

/**
 * Get the best available provider based on API key availability and priority
 * Priority: Primary provider (if set) > OpenAI > OpenRouter > DeepSeek > Groq > Together
 */
function getBestAvailableProvider() {
  // Validate primary provider configuration first
  validatePrimaryProvider();

  // If a primary provider is specified and available, use it
  if (AI_CONFIG.primaryProvider) {
    return AI_CONFIG.primaryProvider;
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
