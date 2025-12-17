/**
 * Utility Helper Functions
 * Reusable functions for text processing, formatting, and validation
 */

/**
 * Safely replace placeholders in content with data values
 * Handles missing data gracefully by keeping placeholder or using fallback
 * @param {string} content - Content with placeholders like %1%, %2%
 * @param {Object} replacements - Object mapping placeholder numbers to values
 * @param {string} fallback - Fallback value for missing placeholders (default: "N/A")
 * @returns {string} Content with placeholders replaced
 */
export function replacePlaceholders(content, replacements, fallback = "N/A") {
  if (!content || typeof content !== "string") {
    return content || "";
  }

  // Match all placeholders like %1%, %2%, etc.
  return content.replace(/%(\d+)%/g, (match, num) => {
    const value = replacements[num];
    return value !== undefined && value !== null ? String(value) : fallback;
  });
}

/**
 * Normalize line breaks to a consistent style
 * @param {string} content - Content with mixed line breaks
 * @param {string} style - Target line break style ("\n" or "\r\n")
 * @returns {string} Content with consistent line breaks
 */
export function normalizeLineBreaks(content, style = "\n") {
  if (!content || typeof content !== "string") {
    return content || "";
  }

  // First normalize all to \n, then convert to target style
  let normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (style === "\r\n") {
    normalized = normalized.replace(/\n/g, "\r\n");
  }

  return normalized;
}

/**
 * Find all hashtags in content with their positions
 * Uses matchAll for accurate position tracking (handles duplicates correctly)
 * @param {string} content - Content to search for hashtags
 * @returns {Object} Object with count, all hashtags, and categorized by position
 */
export function findHashtags(content) {
  if (!content || typeof content !== "string") {
    return { count: 0, all: [], inText: [], atEnd: [] };
  }

  const hashtagRegex = /#\w+/g;
  const matches = [...content.matchAll(hashtagRegex)];

  if (matches.length === 0) {
    return { count: 0, all: [], inText: [], atEnd: [] };
  }

  // Find the last line start index (after last newline)
  const lastNewlineIndex = Math.max(
    content.lastIndexOf("\n"),
    content.lastIndexOf("\r")
  );
  const lastLineStartIndex = lastNewlineIndex === -1
    ? Math.floor(content.length * 0.75) // Fallback: last 25% of content
    : lastNewlineIndex + 1;

  const all = [];
  const inText = [];
  const atEnd = [];

  for (const match of matches) {
    const hashtag = match[0];
    const index = match.index;

    all.push({ hashtag, index });

    if (index >= lastLineStartIndex) {
      atEnd.push({ hashtag, index });
    } else {
      inText.push({ hashtag, index });
    }
  }

  return {
    count: all.length,
    all,
    inText,
    atEnd,
  };
}

/**
 * Insert line breaks before hashtags at the end of content
 * Maintains consistent line break style
 * @param {string} content - Content to format
 * @param {string} lineBreak - Line break style ("\n" or "\r\n")
 * @returns {string} Formatted content
 */
export function formatHashtagBlock(content, lineBreak = "\n") {
  if (!content || typeof content !== "string") {
    return content || "";
  }

  const hashtags = findHashtags(content);

  // No hashtags at end, return as-is
  if (hashtags.atEnd.length === 0) {
    return content;
  }

  // Find the first hashtag at end
  const firstEndHashtag = hashtags.atEnd[0];
  const hashtagIndex = firstEndHashtag.index;

  // Check if there's already proper spacing
  const doubleLineBreak = lineBreak + lineBreak;
  const beforeHashtag = content.slice(Math.max(0, hashtagIndex - 4), hashtagIndex);

  // Already has double line break before hashtag
  if (beforeHashtag.includes("\n\n") || beforeHashtag.includes("\r\n\r\n")) {
    return content;
  }

  // Insert double line break before hashtags
  const beforeContent = content.slice(0, hashtagIndex).trimEnd();
  const afterContent = content.slice(hashtagIndex);

  return beforeContent + doubleLineBreak + afterContent;
}

/**
 * Clean and format content for social media
 * Removes markdown, normalizes whitespace, handles quotes
 * @param {string} content - Raw content to clean
 * @param {Object} options - Formatting options
 * @param {string} options.lineBreak - Line break style ("\n" or "\r\n")
 * @param {number} options.maxLength - Maximum content length (optional)
 * @param {boolean} options.keepFirstBlock - Keep only first paragraph block
 * @param {boolean} options.formatHashtags - Add spacing before hashtags
 * @returns {string} Cleaned and formatted content
 */
export function formatContent(content, options = {}) {
  if (!content || typeof content !== "string") {
    return "";
  }

  const {
    lineBreak = "\n",
    maxLength = null,
    keepFirstBlock = false,
    formatHashtags = true,
  } = options;

  // Step 1: Normalize escaped line breaks FIRST (before any other processing)
  content = content.replace(/\\r\\n/g, "\r\n");
  content = content.replace(/\\n/g, "\n");

  // Step 2: Trim and remove wrapping quotes
  content = content.trim();
  if (
    (content.startsWith('"') && content.endsWith('"')) ||
    (content.startsWith("'") && content.endsWith("'"))
  ) {
    content = content.slice(1, -1);
  }

  // Step 3: Remove markdown formatting (careful not to over-strip)
  // Only strip paired markdown, not standalone asterisks
  content = content.replace(/\*\*([^*]+)\*\*/g, "$1"); // Bold: **text**
  content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1"); // Italic: *text* (not **)
  content = content.replace(/`([^`]+)`/g, "$1"); // Code: `text`
  content = content.replace(/^#{1,6}\s+/gm, ""); // Headers: # ## ###

  // Step 4: Normalize line breaks to consistent style
  content = normalizeLineBreaks(content, lineBreak);

  // Step 5: Remove excessive whitespace
  const doubleBreak = lineBreak + lineBreak;
  const tripleBreak = lineBreak + lineBreak + lineBreak;
  while (content.includes(tripleBreak)) {
    content = content.replace(new RegExp(tripleBreak.replace(/\r/g, "\\r").replace(/\n/g, "\\n"), "g"), doubleBreak);
  }
  content = content.replace(/[ \t]{2,}/g, " "); // Multiple spaces/tabs to single space
  content = content.replace(/^[ \t]+|[ \t]+$/gm, ""); // Trim each line

  content = content.trim();

  // Step 6: Keep only first block if requested
  if (keepFirstBlock) {
    const separator = lineBreak === "\r\n" ? /\r\n\r\n/ : /\n\n/;
    content = content.split(separator)[0].trim();
  }

  // Step 7: Format hashtag block if requested
  if (formatHashtags) {
    content = formatHashtagBlock(content, lineBreak);
  }

  // Step 8: Enforce character limit if specified
  if (maxLength && content.length > maxLength) {
    content = content.slice(0, maxLength - 1).trimEnd() + "…";
  }

  return content;
}

/**
 * Validate that an array has minimum required items
 * @param {Array} arr - Array to validate
 * @param {number} minLength - Minimum required length
 * @param {string} name - Name for error message
 * @throws {Error} When array doesn't meet requirements
 */
export function validateArrayLength(arr, minLength, name = "Array") {
  if (!Array.isArray(arr)) {
    throw new Error(`${name} must be an array`);
  }
  if (arr.length < minLength) {
    throw new Error(`${name} must have at least ${minLength} items, got ${arr.length}`);
  }
}

/**
 * Safely access array item with fallback
 * @param {Array} arr - Array to access
 * @param {number} index - Index to access
 * @param {*} fallback - Fallback value if index doesn't exist
 * @returns {*} Array item or fallback
 */
export function safeArrayAccess(arr, index, fallback = null) {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return fallback;
  }
  return arr[index];
}
