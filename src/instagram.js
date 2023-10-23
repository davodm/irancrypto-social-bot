/**
 * Instagran helper to publish the content
 * using: "instagram-private-api": 1.45.3
 */

const { IgApiClient } = require("instagram-private-api");
const { readFileSync, existsSync } = require("fs");
const { isOffline, getENV } = require("./env");
const ig = new IgApiClient();
let user;

/**
 * Basic Login to Instagram
 * @returns {boolean}
 */
async function login() {
  try {
    // Generate Device ID
    ig.state.generateDevice(process.env.IG_USERNAME);
    if (process.env?.IG_PROXY) {
      ig.state.proxyUrl = process.env.IG_PROXY;
    }
    // Session Management on production - Dynamo DB
    if (getENV("IG_STORE_SESSION", "false") === "true" && !isOffline()) {
      let sessSave = false;
      // Execute after each requests
      ig.request.end$.subscribe(async () => {
        if (!sessSave) {
          const serialized = await ig.state.serialize();
          await saveSession(serialized);
          sessSave = true;
        }
      });
      // Restore session
      const sess = await loadSession();
      if (sess) {
        // the string should be a JSON object
        await ig.state.deserialize(sess);
      }
    }
    // Simulate pre-login flow
    if (getENV("IG_PRELOGIN", "false") === "true") {
      await ig.simulate.preLoginFlow();
    }
    // Login
    user = await ig.account.login(
      process.env.IG_USERNAME,
      process.env.IG_PASSWORD
    );
    return true;
  } catch (error) {
    console.error(
      "Could not login into Instagram, could try authorizing through helper?"
    );
    console.log("cd", error.code);
    throw error;
  }
}

/**
 * Save session to DynamoDB
 * @param {object} sessData
 * @returns
 */
async function saveSession(sessData) {
  let { updateInstagram } = await import("./dynamodb.js");
  // this deletes the version info, so you'll always use the version provided by the library
  // delete serialized.constants;
  // replace constants
  /*
  const appversion = getENV("IG_APP_VERSION", "227.0.0.12.117");
  const appversionCode= getENV("IG_APP_VERSION_CODE", "323703830");
  sessData.constants = {
    ...sessData.constants,
    APP_VERSION: appversion,
    APP_VERSION_CODE: appversionCode,
  }
  */
  // Save it to DynamoDB
  return await updateInstagram({
    session: JSON.stringify(sessData),
  });
}

/**
 * Restore session from DynamoDB
 * @returns {object}
 */
async function loadSession() {
  let { getInstagram } = await import("./dynamodb.js");
  const instagram = await getInstagram();
  if (instagram?.session) {
    return JSON.parse(instagram.session);
  }
  return null;
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
