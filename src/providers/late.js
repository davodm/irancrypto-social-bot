/**
 * Late provider for Instagram posting
 * Uses Late API SDK to publish content via presigned upload + post creation
 * @see https://docs.getlate.dev/platforms/instagram
 */
import { readFileSync, existsSync } from "fs";
import { fileTypeFromBuffer } from "file-type";
import Late from "@getlatedev/node";
import { getENV } from "../env.js";

const client = new Late({ apiKey: getENV("LATE_API_KEY", "") });

/**
 * Get the configured Late Instagram account ID
 * @returns {string}
 */
function getAccountId() {
  return getENV("LATE_IG_ACCOUNT_ID");
}

/**
 * Upload a media buffer to Late via presigned URL
 * @param {Buffer} buffer - File buffer to upload
 * @param {string} filename - File name with extension (e.g. "photo.jpg")
 * @returns {Promise<string>} Public URL of the uploaded media
 */
async function uploadMedia(buffer, filename) {
  const type = await fileTypeFromBuffer(buffer);
  const contentType = type?.mime || "image/jpeg";

  // Step 1: Get a presigned upload URL
  const { data: presign } = await client.media.getMediaPresignedUrl({
    body: { filename, contentType },
  });

  // Step 2: Upload the buffer directly to the presigned URL
  await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buffer,
  });

  return presign.publicUrl;
}

/**
 * Convert a file path or buffer into a Buffer
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
 * Publish an image to Instagram via Late API
 * @param {Buffer|string} file - Image buffer or file path
 * @param {string} caption - Post caption
 * @returns {Promise<{id: string}>}
 */
export async function publishImage(file, caption) {
  const buffer = toBuffer(file, "Image file");
  const publicUrl = await uploadMedia(buffer, "post.jpg");

  const { data: post } = await client.posts.createPost({
    body: {
      content: caption,
      mediaUrls: [publicUrl],
      platforms: [{ platform: "instagram", accountId: getAccountId() }],
      publishNow: true,
    },
  });

  return { id: post._id };
}

/**
 * Publish a video to Instagram via Late API
 * @param {Buffer|string} videoFile - Video buffer or file path
 * @param {Buffer|string|null} videoCover - Cover image buffer or file path
 * @param {string} caption - Post caption
 * @returns {Promise<{id: string}>}
 */
export async function publishVideo(videoFile, videoCover, caption) {
  const videoBuffer = toBuffer(videoFile, "Video file");
  const videoUrl = await uploadMedia(videoBuffer, "video.mp4");

  const platformEntry = {
    platform: "instagram",
    accountId: getAccountId(),
  };

  // Upload custom thumbnail if provided
  if (videoCover) {
    const coverBuffer = toBuffer(videoCover, "Cover file");
    const coverUrl = await uploadMedia(coverBuffer, "cover.jpg");
    platformEntry.platformSpecificData = { instagramThumbnail: coverUrl };
  }

  const { data: post } = await client.posts.createPost({
    body: {
      content: caption,
      mediaUrls: [videoUrl],
      platforms: [platformEntry],
      publishNow: true,
    },
  });

  return { id: post._id };
}

/**
 * Publish a story to Instagram via Late API
 * @param {Buffer|string} file - Image/video buffer or file path
 * @returns {Promise<{id: string}>}
 */
export async function publishStory(file) {
  const buffer = toBuffer(file, "Story file");
  const type = await fileTypeFromBuffer(buffer);
  const isVideo = type?.mime?.startsWith("video/");

  const filename = isVideo ? "story.mp4" : "story.jpg";
  const publicUrl = await uploadMedia(buffer, filename);

  const { data: post } = await client.posts.createPost({
    body: {
      mediaUrls: [publicUrl],
      platforms: [
        {
          platform: "instagram",
          accountId: getAccountId(),
          platformSpecificData: { contentType: "story" },
        },
      ],
      publishNow: true,
    },
  });

  return { id: post._id };
}
