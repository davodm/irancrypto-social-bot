/**
 * This part is CLI - local based to fetch twitter access token
 */
import prompt from "prompt";
import fs from "fs";
import path from "path";
import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

async function main() {
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    process.env.TWITTER_CALLBACK_URL,
    { scope: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
  );
  console.log(`\r\nGo to this link to auth your account ->\r\n`);
  console.log(url);
  console.log(`\r\nAfter authorization, paste the redirected URL below:\r\n`);

  prompt.start();
  const { redirectedURL } = await prompt.get(["redirectedURL"]);
  await login(redirectedURL, codeVerifier);
}

function updateEnvFile(tokens) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return false;

  let content = fs.readFileSync(envPath, "utf-8");
  for (const [key, value] of Object.entries(tokens)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  fs.writeFileSync(envPath, content, "utf-8");
  return true;
}

async function login($redirectedURL, $codeVerifier) {
  try {
    const urlParams = new URL($redirectedURL).searchParams;
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client.loginWithOAuth2({
      code: urlParams.get("code"),
      codeVerifier: $codeVerifier,
      redirectUri: process.env.TWITTER_CALLBACK_URL,
    });

    console.log(`\r\nTokens obtained successfully!\r\n`);
    console.log(`TWITTER_ACCESS_TOKEN=${accessToken}`);
    console.log(`TWITTER_REFRESH_TOKEN=${refreshToken}`);
    console.log(`Expires in: ${expiresIn} seconds\r\n`);

    const updated = updateEnvFile({
      TWITTER_ACCESS_TOKEN: accessToken,
      TWITTER_REFRESH_TOKEN: refreshToken,
    });
    if (updated) {
      console.log(`.env file updated with new tokens.\r\n`);
    }

    try {
      const $me = await loggedClient.v2.me();
      console.log(`Username logged in: ${$me.data.username}`);
    } catch (meErr) {
      console.warn(
        "Could not fetch user profile (tokens are still valid):",
        meErr.data ?? meErr.message
      );
    }
  } catch (err) {
    console.error("Error:", err.data ?? err);
  }
}

main();
