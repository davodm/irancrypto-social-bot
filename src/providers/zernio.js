/**
 * Zernio provider for Instagram posting
 *
 * Uses the Zernio REST API directly (no SDK):
 * - POST /v1/media/presign — get a presigned upload URL
 * - PUT uploadUrl — upload media bytes
 * - POST /v1/posts — create and publish the post
 *
 * @see https://docs.zernio.com/posts/create-post
 * @see https://docs.zernio.com/media/get-media-presigned-url
 * @see https://docs.zernio.com/platforms/instagram
 */
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "fs";
import { fileTypeFromBuffer } from "file-type";
import { getENV } from "../env.js";

/** Zernio API base URL (see curl examples in platform docs) */
const API_BASE = "https://zernio.com/api/v1";

/**
 * @returns {string} Bearer API key from ZERNIO_API_KEY
 */
function getApiKey() {
  return getENV("ZERNIO_API_KEY", "");
}

/**
 * @returns {string} Connected Instagram account ID from ZERNIO_IG_ACCOUNT_ID
 */
function getAccountId() {
  return getENV("ZERNIO_IG_ACCOUNT_ID");
}

/**
 * Authenticated JSON request to the Zernio API.
 * Sends a fresh x-request-id per call for safe retries (5-minute idempotency window).
 *
 * @param {string} method - HTTP method
 * @param {string} path - Path under /v1 (e.g. "/posts")
 * @param {object} [body] - JSON body
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiRequest(method, path, body) {
  const headers = {
    Authorization: `Bearer ${getApiKey()}`,
    Accept: "application/json",
    "x-request-id": randomUUID(),
  };

  const init = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, init);
  const data = await response.json().catch(() => ({}));

  // Idempotent retry — same x-request-id returns the original post (HTTP 200)
  if (response.status === 200 && data.existingPost) {
    return data;
  }

  if (!response.ok) {
    const message =
      data.error ||
      data.message ||
      `Zernio API ${method} ${path} failed (${response.status})`;

    // Content-hash dedup within 24h (HTTP 409)
    if (response.status === 409 && data.details?.existingPostId) {
      throw new Error(
        `${message} (existingPostId: ${data.details.existingPostId})`
      );
    }

    throw new Error(message);
  }

  return data;
}

/**
 * Convert a file path or buffer into a Buffer.
 * @param {Buffer|string} file - File path or buffer
 * @param {string} label - Description for error messages
 * @returns {Buffer}
 */
function toBuffer(file, label = "File") {
  if (typeof file === "string") {
    if (!existsSync(file)) throw new Error(`${label} not found`);
    return readFileSync(file);
  }
  return file;
}

/**
 * Map a MIME type to a Zernio mediaItems `type` value.
 * @param {string} mime
 * @returns {"image"|"video"}
 */
function mediaTypeFromMime(mime) {
  if (mime?.startsWith("video/")) return "video";
  return "image";
}

/**
 * Upload a media buffer via Zernio presigned URL flow.
 *
 * @param {Buffer} buffer - File bytes
 * @param {string} filename - File name with extension (e.g. "post.jpg")
 * @returns {Promise<{ publicUrl: string, type: "image"|"video" }>}
 */
async function uploadMedia(buffer, filename) {
  const detected = await fileTypeFromBuffer(buffer);
  const contentType = detected?.mime || "image/jpeg";
  const type = mediaTypeFromMime(contentType);

  const presign = await apiRequest("POST", "/media/presign", {
    filename,
    contentType,
    size: buffer.length,
  });

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Zernio media upload failed (${uploadResponse.status} ${uploadResponse.statusText})`
    );
  }

  return { publicUrl: presign.publicUrl, type };
}

/**
 * Build the Instagram platform entry for createPost.
 * @param {object} [platformSpecificData] - Instagram-specific options (story, thumbnail, etc.)
 * @returns {object}
 */
function instagramPlatform(platformSpecificData) {
  const entry = {
    platform: "instagram",
    accountId: getAccountId(),
  };

  if (platformSpecificData && Object.keys(platformSpecificData).length > 0) {
    entry.platformSpecificData = platformSpecificData;
  }

  return entry;
}

/**
 * Create and immediately publish an Instagram post via Zernio.
 *
 * @param {object} params
 * @param {string} [params.content] - Caption text
 * @param {Array<{ type: "image"|"video", url: string }>} params.mediaItems
 * @param {object} [params.platformSpecificData] - Merged into the Instagram platform entry
 * @returns {Promise<{ id: string, code?: string, url?: string }>}
 */
async function createInstagramPost({ content, mediaItems, platformSpecificData }) {
  const data = await apiRequest("POST", "/posts", {
    content,
    mediaItems,
    platforms: [instagramPlatform(platformSpecificData)],
    publishNow: true,
  });

  const post = data.post ?? data.existingPost;
  if (!post?._id) {
    throw new Error("Zernio create post response missing post id");
  }

  return formatPublishResult(post);
}

/**
 * Normalize Zernio post response to the shared provider shape.
 *
 * @param {object} post - Zernio post object (_id, platforms, …)
 * @returns {{ id: string, code?: string, url?: string }}
 */
function formatPublishResult(post) {
  const igPlatform = post.platforms?.find((p) => p.platform === "instagram");
  const url = igPlatform?.platformPostUrl;

  return {
    id: post._id,
    ...(url
      ? {
          url,
          code: extractPostCode(url),
        }
      : {}),
  };
}

/**
 * Extract Instagram post shortcode from a public post URL.
 * @param {string} url - Instagram post URL
 * @returns {string}
 */
function extractPostCode(url) {
  const match = url?.match(/instagram\.com\/(?:p|reel)\/(\w+)\/?/);
  return match ? match[1] : "";
}

/**
 * Publish an image to Instagram via Zernio.
 * @param {Buffer|string} file - Image buffer or file path
 * @param {string} caption - Post caption
 * @returns {Promise<{ id: string, code?: string, url?: string }>}
 */
export async function publishImage(file, caption) {
  const buffer = toBuffer(file, "Image file");
  const { publicUrl, type } = await uploadMedia(buffer, "post.jpg");

  return createInstagramPost({
    content: caption,
    mediaItems: [{ type, url: publicUrl }],
  });
}

/**
 * Publish a video to Instagram via Zernio (feed post).
 * Custom cover images use platformSpecificData.instagramThumbnail per Zernio docs.
 *
 * @param {Buffer|string} videoFile - Video buffer or file path
 * @param {Buffer|string|null} videoCover - Cover image buffer or file path
 * @param {string} caption - Post caption
 * @returns {Promise<{ id: string, code?: string, url?: string }>}
 */
export async function publishVideo(videoFile, videoCover, caption) {
  const videoBuffer = toBuffer(videoFile, "Video file");
  const { publicUrl, type } = await uploadMedia(videoBuffer, "video.mp4");

  /** @type {object} */
  const platformSpecificData = {};

  if (videoCover) {
    const coverBuffer = toBuffer(videoCover, "Cover file");
    const cover = await uploadMedia(coverBuffer, "cover.jpg");
    platformSpecificData.instagramThumbnail = cover.publicUrl;
  }

  return createInstagramPost({
    content: caption,
    mediaItems: [{ type, url: publicUrl }],
    platformSpecificData,
  });
}

/**
 * Publish a story to Instagram via Zernio.
 * Stories use platformSpecificData.contentType = "story"; captions are not shown on IG.
 *
 * @param {Buffer|string} file - Image or video buffer or file path
 * @returns {Promise<{ id: string, code?: string, url?: string }>}
 */
export async function publishStory(file) {
  const buffer = toBuffer(file, "Story file");
  const detected = await fileTypeFromBuffer(buffer);
  const isVideo = detected?.mime?.startsWith("video/");
  const filename = isVideo ? "story.mp4" : "story.jpg";

  const { publicUrl, type } = await uploadMedia(buffer, filename);

  return createInstagramPost({
    mediaItems: [{ type, url: publicUrl }],
    platformSpecificData: { contentType: "story" },
  });
}
