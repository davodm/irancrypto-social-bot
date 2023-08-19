/**
 * Twitter helper to write the content
 * Could get improved by TwitterApiRateLimitPlugin
 */
const { TwitterApi } = require("twitter-api-v2");
const { readFileSync } = require("fs");
const fetch = require("node-fetch");
const {getTwitter,updateTwitter} = require('./dynamodb');
let client;

async function init() {
  //Get From Dynamo
  $data=await getTwitter();
  //If it's updated less than an hour
  if($data?.timestamp && (Date.now() - $data.timestamp) < 3600000){
    client=new TwitterApi($data.accessToken);
    return;
  }
  //Refresh it first
  client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });

  const req=await client.refreshOAuth2Token($data.refreshToken ?? process.env.TWITTER_REFRESH_TOKEN);
  if(req?.refreshToken){
    client=req.client;
    await updateTwitter({
      accessToken: req.accessToken,
      refreshToken: req.refreshToken,
      expiresIn: expiresIn
    });
  }
}
/**
 * Write a tweet
 * @param {string} $text
 * @param {string[]} $mediaFiles
 * @returns
 */
async function tweet($text, $mediaFiles = []) {
  //Init client to use access token or refresh it
  if(!client){
    await init();
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

async function reply($tweetID, $text, $mediaFiles = []) {
  //Init client to use access token or refresh it
  if(!client){
    await init();
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

module.exports = {
  tweet,
  reply
};
