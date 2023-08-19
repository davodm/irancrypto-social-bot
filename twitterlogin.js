/**
 * This part is CLI - local based to fetch twitter access token
 */
require("dotenv").config();//Since it's on local run
const prompt = require('prompt');
const { TwitterApi } = require("twitter-api-v2");
const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});
//Random url matches with your twitter app
const CALLBACK_URL = "https://irancrypto.market/twitterbot/";

async function main() {
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    CALLBACK_URL,
    { scope: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
  );
  console.log("\r\nSave Code verifierer below ->");
  console.log(`\r\n${codeVerifier}\r\n`);
  console.log(`Go to this link to auth your account ->\r\n`);
  console.log("url", url);
  console.log(`\r\nAfter all answer the prompts!`);

  prompt.start();
  const {redirectedURL, $codeVerifier} = await prompt.get(['redirectedURL', '$codeVerifier']);
  await login(redirectedURL,$codeVerifier);
}

async function login($redirectedURL, $codeVerifier) {
  try{
    const urlParams = new URLSearchParams($redirectedURL);
    const {
        client: loggedClient,
        accessToken,
        refreshToken,
        expiresIn,
      } = await client.loginWithOAuth2({
        code: urlParams.get("code"),
        codeVerifier: $codeVerifier,
        redirectUri: CALLBACK_URL,
      });
      const $me=await loggedClient.v2.me();
      console.log(`Alright everything is done!\r\n`);
      console.log(`Username Loggedin: ${$me.data.username}\r\n\r\n`);
      console.log(`Access Token:\r\n\r\n${accessToken}\r\n`);
      console.log(`Refresh Token:\r\n\r\n${refreshToken}\r\n`);
      console.log(`Expires in: ${expiresIn} seconds`);
  }catch(err){
    console.error('Error:'+err.messsage);
  }
}

main();
