/**
 * Instagran helper to publish the content using two ways of direct publishing and publishing through the Ayreshare
 */
import { readFileSync, existsSync } from "fs";
import {
  publishImage as igPublishImage,
  publishVideo as igPublishVideo,
  publishStory as igPublishStory,
} from "./igapi.js";
import SocialPost from "social-post-api";
import { getENV } from "./env.js";

const ayreShare = new SocialPost(getENV("AYRESHARE_API_KEY"));

/**
 * Publish post through Ayreshare
 * @param {*} file
 * @param {string} caption
 * @param {*} cover
 * @param {boolean} story
 * @returns {Promise<object>}
 */
async function postAyreshare(file, caption, cover = null, story = false) {
  // Check if the file exists
  if (typeof file === "string" && !existsSync(file)) {
    throw new Error("File not found");
  }
  // Params of Request
  const params = {
    post: caption,
    platforms: ["instagram"],
    mediaUrls: [
      // Convert to base64
      typeof file === "string" ? readFileSync(file).toString("base64") : file,
    ],
  };
  // Add Cover to params
  if (cover && typeof cover === "string" && !existsSync(cover)) {
    throw new Error("Cover file not found");
  }
  if (cover) {
    params["instagramOptions"]["coverUrl"] =
      typeof cover === "string"
        ? readFileSync(cover).toString("base64")
        : cover;
  }
  // Add story to params
  if (story) {
    params["instagramOptions"]["story"] = true;
  }
  // Post Request
  const post = await ayreShare.post(params);
  return {
    id: post.postIds[0].id,
    code: post.postIds[0].postUrl.match(
      /https?:\/\/(?:www\.)?instagram\.com\/p\/(\w+)\/?$/
    )[1],
  };
}

/**
 * Publish an image
 * @param {*} file
 * @param {string} caption
 * @returns {object}
 */
export async function publishImage(file, caption) {
  // Direct Way
  try {
    return await igPublishImage(file, caption);
  } catch (err) {
    // Nothing to do
  }
  // Ayreshare Way
  try {
    return await postAyreshare(file, caption);
  } catch (err) {
    // Nothing to do
  }
  throw new Error("Image not published");
}

/**
 * Publish a video
 * @param {*} videoFile
 * @param {*} videoCover
 * @param {string} caption
 * @returns {object}
 */
export async function publishVideo(videoFile, videoCover, caption) {
  // Direct Way
  try {
    return await igPublishVideo(videoFile, videoCover, caption);
  } catch (err) {
    // Nothing to do
  }
  // Ayreshare Way
  try {
    return await postAyreshare(videoFile, caption, videoCover);
  } catch (err) {
    // Nothing to do
  }
  throw new Error("Video not published");
}

/**
 * Publish a story
 * @param {*} file
 * @returns {boolean}
 */
export async function publishStory(file) {
  // Direct Way
  try {
    return await igPublishStory(file);
  } catch (err) {
    // Nothing to do
  }
  // Ayreshare Way
  try {
    return await postAyreshare(file, "", null, true);
  } catch (err) {
    // Nothing to do
  }
  throw new Error("Story not published");
}
