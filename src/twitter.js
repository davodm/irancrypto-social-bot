/**
 * Twitter API helper for posting content
 * Handles authentication, token refresh, and media uploads
 * Using "twitter-api-v2": 1.15.1
 */
import { TwitterApi } from "twitter-api-v2";
import { readFileSync } from "fs";
import { isOffline, isENV, getENV } from "./env.js";

let client;

/**
 * Initialize Twitter client with proper authentication
 * Handles token refresh and DynamoDB storage for serverless deployment
 * @returns {Promise<TwitterApi>} Authenticated Twitter client
 * @throws {Error} When authentication fails
 */
async function init() {
  // Offline Mode (local development)
  if (isOffline()) {
    const accessToken = getENV("TWITTER_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("TWITTER_ACCESS_TOKEN environment variable is required");
    }
    return new TwitterApi(accessToken);
  }

  // Serverless mode - use DynamoDB for token storage
  const { getTwitter, updateTwitter } = await import("./dynamodb.js");
  let action = "refresh";

  try {
    // Get stored tokens from DynamoDB
    const storedData = await getTwitter();

    // First time initialization from environment variables
    if (storedData === false) {
      action = "first";
      const accessToken = getENV("TWITTER_ACCESS_TOKEN");
      const refreshToken = getENV("TWITTER_REFRESH_TOKEN");

      if (!accessToken || !refreshToken) {
        throw new Error("TWITTER_ACCESS_TOKEN and TWITTER_REFRESH_TOKEN environment variables are required");
      }

      await updateTwitter({
        accessToken,
        refreshToken,
        expiresIn: 6000, // Conservative default
      });

      return new TwitterApi(accessToken);
    }

    // Check if stored token is still valid
    if (storedData?.timestamp && Date.now() - storedData.timestamp < storedData.expiresIn * 1000) {
      action = "not_expired";
      return new TwitterApi(storedData.accessToken);
    }

    // Token is expired, refresh it
    const clientId = getENV("TWITTER_CLIENT_ID");
    const clientSecret = getENV("TWITTER_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET environment variables are required");
    }

    const tempClient = new TwitterApi({ clientId, clientSecret });
    const refreshResult = await tempClient.refreshOAuth2Token(
      storedData.refreshToken ?? getENV("TWITTER_REFRESH_TOKEN")
    );

    if (refreshResult?.refreshToken) {
      await updateTwitter({
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken,
        expiresIn: refreshResult.expiresIn,
      });

      if (isENV("development")) {
        const user = await refreshResult.client.v2.me();
        console.log("Refreshed Twitter user:", user?.data?.name);
      }

      return refreshResult.client;
    } else {
      throw new Error("Token refresh failed - no refresh token returned");
    }

  } catch (error) {
    if (isENV("development")) {
      console.log("Twitter auth action:", action);
      console.error("Twitter token refresh error:", error.message, error?.errors?.[0]?.message ?? null);
    }
    throw new Error(`Twitter authentication failed: ${error.message}`);
  }
}

/**
 * Post a tweet with optional media attachments
 * @param {string} text - Tweet text content
 * @param {string[]} mediaFiles - Array of file paths or URLs to attach
 * @returns {Promise<object>} Twitter API response
 * @throws {Error} When tweeting fails
 */
export async function tweet(text, mediaFiles = []) {
  try {
    // Initialize client if not already done
    if (!client) {
      client = await init();
    }

    const mediaIds = await prepareMediaFiles(mediaFiles);

    // Build tweet options
    const options = { text };
    if (mediaIds.length > 0) {
      options.media = { media_ids: mediaIds };
    }

    // Send tweet
    const result = await client.v2.tweet(options);

    if (isENV("development")) {
      console.log("Tweet posted successfully:", result.data?.id);
    }

    return result;
  } catch (error) {
    console.error("Failed to post tweet:", error.message);
    throw new Error(`Tweet posting failed: ${error.message}`);
  }
}

/**
 * Reply to a tweet with optional media attachments
 * @param {string} tweetId - ID of the tweet to reply to
 * @param {string} text - Reply text content
 * @param {string[]} mediaFiles - Array of file paths or URLs to attach
 * @returns {Promise<object>} Twitter API response
 * @throws {Error} When reply fails
 */
export async function reply(tweetId, text, mediaFiles = []) {
  try {
    if (!client) {
      client = await init();
    }

    const mediaIds = await prepareMediaFiles(mediaFiles);

    // Build reply options
    const options = {};
    if (mediaIds.length > 0) {
      options.media = { media_ids: mediaIds };
    }

    // Send reply using v2 API for consistency
    const result = await client.v2.reply(tweetId, text, options);

    if (isENV("development")) {
      console.log("Reply posted successfully:", result.data?.id);
    }

    return result;
  } catch (error) {
    console.error("Failed to post reply:", error.message);
    throw new Error(`Reply posting failed: ${error.message}`);
  }
}

/**
 * Prepare media files for upload (download URLs or read local files)
 * @param {string[]} mediaFiles - Array of file paths or URLs
 * @returns {Promise<string[]>} Array of uploaded media IDs
 */
async function prepareMediaFiles(mediaFiles) {
  const mediaIds = [];

  for (const file of mediaFiles) {
    try {
      let buffer;

      if (isValidUrl(file)) {
        // Download from URL
        buffer = await download(file);
      } else {
        // Read from local file
        buffer = readFileSync(file);
      }

      if (buffer) {
        const mediaId = await uploadMedia(buffer);
        mediaIds.push(mediaId);
      }
    } catch (error) {
      console.error(`Failed to process media file ${file}:`, error.message);
      // Continue with other files instead of failing completely
    }
  }

  return mediaIds;
}

/**
 * Upload file buffer to Twitter media
 * @param {Buffer} fileBuffer - File content buffer
 * @returns {Promise<string>} Media ID for use in tweets
 * @throws {Error} When upload fails
 */
async function uploadMedia(fileBuffer) {
  try {
    const { fileTypeFromBuffer } = await import("file-type");
    const fileType = await fileTypeFromBuffer(fileBuffer);

    if (!fileType) {
      throw new Error("Unable to determine file type");
    }

    const mediaId = await client.v1.uploadMedia(fileBuffer, {
      type: fileType.ext,
    });

    return mediaId;
  } catch (error) {
    console.error("Media upload failed:", error.message);
    throw new Error(`Media upload failed: ${error.message}`);
  }
}

/**
 * Download media file from URL and return buffer
 * @param {string} url - URL to download from
 * @returns {Promise<Buffer>} File buffer
 * @throws {Error} When download fails
 */
async function download(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.buffer();
  } catch (error) {
    console.error(`Download failed for ${url}:`, error.message);
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Check if string is a valid HTTP/HTTPS URL
 * @param {string} str - String to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}