/**
 * Instagram posting helper
 * Delegates to a configured provider (ayrshare or late) via INSTAGRAM_PROVIDER env var
 */
import { getENV } from "./env.js";

// Supported provider names mapped to their module paths
const PROVIDERS = {
  ayrshare: "./providers/ayrshare.js",
  late: "./providers/late.js",
};

/**
 * Dynamically load the configured Instagram provider module
 * @returns {Promise<{publishImage: Function, publishVideo: Function, publishStory: Function}>}
 */
async function getProvider() {
  const name = getENV("INSTAGRAM_PROVIDER", "ayrshare");

  if (!PROVIDERS[name]) {
    throw new Error(
      `Unknown INSTAGRAM_PROVIDER "${name}". Supported: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }

  return await import(PROVIDERS[name]);
}

/**
 * Publish an image to Instagram
 * @param {Buffer|string} file - Image buffer or file path
 * @param {string} caption - Post caption
 * @returns {Promise<{id: string, code?: string}>}
 */
export async function publishImage(file, caption) {
  const provider = await getProvider();
  return await provider.publishImage(file, caption);
}

/**
 * Publish a video to Instagram
 * @param {Buffer|string} videoFile - Video buffer or file path
 * @param {Buffer|string|null} videoCover - Cover image buffer or file path
 * @param {string} caption - Post caption
 * @returns {Promise<{id: string, code?: string}>}
 */
export async function publishVideo(videoFile, videoCover, caption) {
  const provider = await getProvider();
  return await provider.publishVideo(videoFile, videoCover, caption);
}

/**
 * Publish a story to Instagram
 * @param {Buffer|string} file - Image/video buffer or file path
 * @returns {Promise<{id: string, code?: string}>}
 */
export async function publishStory(file) {
  const provider = await getProvider();
  return await provider.publishStory(file);
}
