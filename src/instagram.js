/**
 * Instagran helper to publish the content
 * using: "instagram-private-api": 1.45.3
 */

const { IgApiClient } = require("instagram-private-api");
const { readFileSync, existsSync } = require("fs");
const ig = new IgApiClient();
let user;

/**
 * Basic Login to Instagram
 */
async function login() {
  try {
    ig.state.generateDevice(process.env.IG_USERNAME);
    if (process.env?.IG_PROXY) {
      ig.state.proxyUrl = process.env.IG_PROXY;
    }
    user = await ig.account.login(
      process.env.IG_USERNAME,
      process.env.IG_PASSWORD
    );
    return true;
  } catch (error) {
    console.error(
      "Could not login into Instagram, could thry authorizing through helper?"
    );
    throw error;
  }
}

/**
 * Publish an image
 * @param {*} file 
 * @param {string} caption 
 * @returns {object}
 */
async function publishImage(file, caption) {
  // Login to account first
  await login();
  if (typeof file === "string" && !existsSync(file)) {
    throw new Error("File not found");
  }
  try {
    const request = await ig.publish.photo({
      // read the file into a Buffer
      file: typeof file === "string" ? readFileSync(file) : file, //Supporting readFile and buffer
      caption: caption,
    });
    return {
      id: request.media.id,
      code: request.media.code,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Publish a video
 * @param {*} videoFile 
 * @param {*} videoCover 
 * @param {string} caption 
 * @returns {object}
 */
async function publishVideo(videoFile, videoCover, caption) {
  // Login to account first
  await login();

  if (typeof videoFile === "string" && !existsSync(videoFile)) {
    throw new Error("Video file not found");
  }
  if (typeof videoCover === "string" && !existsSync(videoCover)) {
    throw new Error("Video cover file not found");
  }

  try {
    const request = await ig.publish.video({
      // read the file into a Buffer
      video:
        typeof videoFile === "string" ? readFileSync(videoFile) : videoFile, //Supporting buffer and readFile
      coverImage: readFileSync(videoCover),
      caption: caption,
    });
    return {
      id: request.media.id,
      code: request.media.code,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Publish a story
 * @param {*} file 
 * @returns {boolean}
 */
async function publishStory(file) {
  // Login to account first
  await login();
  if (typeof file === "string" && !existsSync(file)) {
    throw new Error("File not found");
  }
  try {
    const request = await ig.publish.story({
      // read the file into a Buffer
      file: typeof file === "string" ? readFileSync(file) : file, //Supporting readFile and buffer
    });
    return true;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  publishImage,
  publishVideo,
  publishStory,
};
