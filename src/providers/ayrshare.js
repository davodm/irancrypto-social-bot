/**
 * Ayrshare provider for Instagram posting
 * Uses social-post-api SDK to publish content via Ayrshare platform
 * @see https://www.ayrshare.com/
 */
import { readFileSync, existsSync } from "fs";
import SocialPost from "social-post-api";
import { getENV } from "../env.js";

const client = new SocialPost(getENV("AYRSHARE_API_KEY", ""));

/**
 * Publish an image to Instagram via Ayrshare
 * @param {Buffer|string} file - Image buffer or file path
 * @param {string} caption - Post caption
 * @returns {Promise<{id: string, code: string}>}
 */
export async function publishImage(file, caption) {
  return await post(file, caption);
}

/**
 * Publish a video to Instagram via Ayrshare
 * @param {Buffer|string} videoFile - Video buffer or file path
 * @param {Buffer|string|null} videoCover - Cover image buffer or file path
 * @param {string} caption - Post caption
 * @returns {Promise<{id: string, code: string}>}
 */
export async function publishVideo(videoFile, videoCover, caption) {
  return await post(videoFile, caption, videoCover);
}

/**
 * Publish a story to Instagram via Ayrshare
 * @param {Buffer|string} file - Image/video buffer or file path
 * @returns {Promise<{id: string, code: string}>}
 */
export async function publishStory(file) {
  return await post(file, "", null, true);
}

/**
 * Post content to Instagram via Ayrshare API
 * @param {Buffer|string} file - Media buffer or file path
 * @param {string} caption - Post caption
 * @param {Buffer|string|null} cover - Optional cover image for videos
 * @param {boolean} story - Whether to post as a story
 * @returns {Promise<{id: string, code: string}>}
 */
async function post(file, caption, cover = null, story = false) {
  validateFile(file, "Media file");
  if (cover) validateFile(cover, "Cover file");

  const params = {
    post: caption,
    platforms: ["instagram"],
    mediaUrls: [toBase64(file)],
    instagramOptions: {},
  };

  if (cover) {
    params.instagramOptions.coverUrl = toBase64(cover);
  }

  if (story) {
    params.instagramOptions.story = true;
  }

  const result = await client.post(params);

  const postUrl = result.postIds[0].postUrl;

  return {
    id: result.postIds[0].id,
    code: extractPostCode(postUrl),
    url: postUrl,
  };
}

/**
 * Validate that a file exists (if given as a path)
 * @param {Buffer|string} file
 * @param {string} label - Description for error messages
 */
function validateFile(file, label) {
  if (typeof file === "string" && !existsSync(file)) {
    throw new Error(`${label} not found`);
  }
}

/**
 * Convert a file path or buffer to base64 string
 * @param {Buffer|string} file - File path or buffer
 * @returns {string} Base64-encoded content
 */
function toBase64(file) {
  if (typeof file === "string") {
    return readFileSync(file).toString("base64");
  }
  return Buffer.isBuffer(file) ? file.toString("base64") : file;
}

/**
 * Extract Instagram post shortcode from URL
 * @param {string} url - Instagram post URL
 * @returns {string} Post shortcode
 */
function extractPostCode(url) {
  const match = url?.match(/instagram\.com\/p\/(\w+)\/?$/);
  return match ? match[1] : "";
}
