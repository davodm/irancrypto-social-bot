/**
 * Twitter helper to write the content
 * Could get improved by TwitterApiRateLimitPlugin
 * Using "twitter-api-v2": 1.15.1
 */
import { TwitterApi} from "twitter-api-v2";
import { readFileSync } from "fs";
import fetch from "node-fetch";
import { isOffline, isENV } from "./env.js";
let client;

async function init() {
  // Import Dynamo DB on serverless
  if (!isOffline()) {
    ({ getTwitter, updateTwitter } = await import("./dynamodb.js"));
  } else {
    // Return client with env tokens
    return new TwitterApi(process.env.TWITTER_ACCESS_TOKEN);
  }
  let $act = "refresh";
  //Get From Dynamo
  $data = await getTwitter();
  //First time init from env
  if ($data === false) {
    $act = "first";
    await updateTwitter({
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      refreshToken: process.env.TWITTER_REFRESH_TOKEN,
      expiresIn: 6000,
    });
    return new TwitterApi(process.env.TWITTER_ACCESS_TOKEN);
  }

  //If it's updated less than it's expiration
  if (
    $data?.timestamp &&
    Date.now() - $data.timestamp < $data.expiresIn * 1000
  ) {
    $act = "not expired";
    return new TwitterApi($data.accessToken);
  }
  //Refresh it while it's expired
  const tmpClient = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });
  try {
    //Request to refresh token
    const req = await tmpClient.refreshOAuth2Token(
      $data.refreshToken ?? process.env.TWITTER_REFRESH_TOKEN
    );
    if (req?.refreshToken) {
      await updateTwitter({
        accessToken: req.accessToken,
        refreshToken: req.refreshToken,
        expiresIn: req.expiresIn,
      });
      if (isENV("development")) {
        console.log(
          "refreshed twitter user name:",
          await req.client.v2.me()?.data?.name
        );
      }
      return req.client;
    } else {
      throw new Error("Couldnt refresh token");
    }
  } catch (error) {
    if (isENV("development")) {
      console.log("Action of twitter access token:", $act);
      console.error(
        "Error in refreshing token",
        error.message,
        error?.errors[0]?.message ?? null
      );
    }
    throw error;
  }
}
/**
 * Write a tweet
 * @param {string} $text
 * @param {string[]} $mediaFiles
 * @returns
 */
export async function tweet($text, $mediaFiles = []) {
  //Init client to use access token or refresh it
  if (!client) {
    client = await init();
  }
  const $mediaIDs = await prepareMediaFiles($mediaFiles);
  //Build options
  const opts = {
    text: $text,
  };
  if ($mediaIDs.length > 0) {
    opts.media = { media_ids: $mediaIDs };
  }
  //Send Request
  return await client.v2.tweet(opts);
}

export async function reply($tweetID, $text, $mediaFiles = []) {
  //Init client to use access token or refresh it
  if (!client) {
    client = await init();
  }
  const $mediaIDs = await prepareMediaFiles($mediaFiles);
  //Build options
  const opts = {};
  if ($mediaIDs.length > 0) {
    opts.media = { media_ids: $mediaIDs };
  }
  //Send Request
  return await client.v1.reply($text, $tweetID, opts);
}

/**
 * Upload Media files from local disk or URL
 * @param {string[]} $mediaFiles
 * @returns {string[]}
 */
async function prepareMediaFiles($mediaFiles) {
  const $mediaIDs = [];
  for await (const $file of $mediaFiles) {
    //Check is that URL to download
    let $buffer;
    if (isValidUrl($file)) {
      $buffer = await download($file);
    } else {
      //Read file locally
      $buffer = readFileSync($file);
    }
    //Upload to twitter media
    if ($buffer) {
      $mediaIDs.push(await uploadMedia($fileContent));
    }
  }
  return $mediaIDs;
}

/**
 * Upload file content buffer to twitter media
 * @param {*} $fileContent
 * @returns
 */
async function uploadMedia($fileContent) {
  const { fileTypeFromBuffer } = await import("file-type");
  const type = fileTypeFromBuffer(buffer);
  return await client.v1.uploadMedia(Buffer.from($fileContent), {
    type: type.ext,
  });
}

/**
 * Download url media file and return the buffer
 * @param {string} $url
 * @returns
 */
async function download($url) {
  const response = await fetch($url);
  return await response.buffer();
}

/**
 * Check is the string valid https url
 * @param {string} str
 * @returns {boolean}
 */
const isValidUrl = (str) => /^https?:\/\//.test(str);