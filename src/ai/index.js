/**
 * AI Content Generation Module
 * Functions for generating social media content using AI
 */
import { ask } from "./request.js";
import { formatContent } from "../util.js";

// Re-export ask and formatContent for external use
export { ask, formatContent };

/**
 * Estimate token count for content (rough approximation)
 * @param {string} content - Text content to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokenCount(content) {
  if (!content || typeof content !== "string") {
    return 0;
  }
  // Rough estimation: 1 token ≈ 3.5 characters (adjusted for Persian/Farsi)
  return Math.ceil(content.length / 3.5);
}

/**
 * Generate engaging tweet templates for cryptocurrency content
 * @param {string} subject - The subject or prompt for the tweet
 * @param {Object} options - Optional configuration
 * @param {number} options.maxLength - Maximum tweet length (default: 280)
 * @param {string} options.tone - Tone of the tweet (professional, casual, excited)
 * @param {boolean} options.includeHashtags - Whether to include hashtags
 * @param {string} options.lineBreak - Line break style ("\n" or "\r\n")
 * @returns {Promise<string|null>} Generated tweet template or null if failed
 */
export async function writeTweet(subject, options = {}) {
  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    throw new Error("Subject must be a non-empty string");
  }

  const config = {
    maxLength: options.maxLength || 280,
    tone: options.tone || "professional",
    includeHashtags: options.includeHashtags !== false,
    lineBreak: options.lineBreak || "\r\n",
  };

  const systemPrompt = `You write creative, engaging tweets for IranCrypto.market (Iran's crypto monitoring platform).

STYLE:
- Be dynamic and insightful, not template-y or boring
- Use the data to tell a story or highlight interesting patterns
- Vary your approach: questions, insights, comparisons, highlights
- ${config.tone} tone, no financial advice
- Currency: IRR

CONSTRAINTS:
- Max ${config.maxLength} characters
- ${config.includeHashtags ? "2-3 relevant hashtags at end" : "No hashtags"}
- 0-2 emojis, natural placement

OUTPUT: Only the tweet text.`;

  const userPrompt = `${subject.trim()}`;

  try {
    const result = await ask(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 4000 }
    );

    if (!result || result.length === 0) {
      return null;
    }

    return formatContent(result[0].message.content, {
      lineBreak: config.lineBreak,
      maxLength: config.maxLength,
      keepFirstBlock: true,
      formatHashtags: true,
    });
  } catch (error) {
    console.warn(`Failed to generate tweet: ${error.message}`);
    return null;
  }
}

/**
 * Generate compelling Instagram captions for cryptocurrency content
 * @param {string} subject - The subject or prompt for the Instagram caption
 * @param {Object} options - Optional configuration
 * @param {number} options.maxHashtags - Maximum number of hashtags (default: 5)
 * @param {string} options.style - Caption style (professional, casual, educational)
 * @param {boolean} options.includeCall2Action - Whether to include call-to-action
 * @param {string} options.lineBreak - Line break style ("\n" or "\r\n")
 * @param {number} options.maxLength - Maximum caption length (default: 400)
 * @returns {Promise<string|null>} Generated Instagram caption or null if failed
 */
export async function writeCaption(subject, options = {}) {
  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    throw new Error("Subject must be a non-empty string");
  }

  const config = {
    maxHashtags: options.maxHashtags || 5,
    style: options.style || "professional",
    includeCall2Action: options.includeCall2Action !== false,
    lineBreak: options.lineBreak || "\n",
    maxLength: options.maxLength || 400,
  };

  const systemPrompt = `You write creative, engaging Instagram captions for IranCrypto.market (Iran's crypto monitoring platform).

STYLE:
- Be dynamic and insightful, not template-y or boring
- Use the data to tell a story, highlight trends, or share interesting insights
- Vary your hooks: questions, bold statements, surprising facts
- ${config.style} tone, educational, no financial advice
- Currency: IRR

STRUCTURE:
- Hook (grab attention)
- 1-2 paragraphs (insights from the data)
- ${config.includeCall2Action ? "CTA (call-to-action)" : "Closing line"}
- Hashtags at end

CONSTRAINTS:
- Max ${config.maxLength} characters
- 0-${config.maxHashtags} relevant hashtags
- 0-4 emojis, natural placement

OUTPUT: Only the caption text.`;

  const userPrompt = `${subject.trim()}`;

  try {
    const result = await ask(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 4000 }
    );

    if (!result || result.length === 0) {
      return null;
    }

    return formatContent(result[0].message.content, {
      lineBreak: config.lineBreak,
      maxLength: config.maxLength,
      keepFirstBlock: false, // Instagram captions can have multiple paragraphs
      formatHashtags: true,
    });
  } catch (error) {
    console.warn(`Failed to generate caption: ${error.message}`);
    return null;
  }
}
