import { tweet } from "./twitter.js";
import { publishImage } from "./instagram.js";
import { writeTweet, writeCaption } from "./ai/index.js";
import { abbreviateNumber, numFormat } from "./number.js";
import { createImageFromTemplate, getRandomTheme } from "./html.js";
import { getENV } from "./env.js";
import {
  replacePlaceholders,
  formatHashtagBlock,
  normalizeLineBreaks,
  safeArrayAccess,
} from "./util.js";
import TelegramBot from "node-telegram-bot-api";
import moment from "moment";

const bot = new TelegramBot(getENV("TELEGRAM_BOT_TOKEN"));

// Default line break style for tweets (CRLF for Twitter compatibility)
const TWEET_LINE_BREAK = "\r\n";

// AI prompts for tweet generation
const tweetPrompts = {
  trends: `Create ONE tweet template about the top 3 crypto trends in Iran in the last 24 hours.

Output format (exact):
Top 3 crypto trends in Iran (24h):
1. %1% (%2% IRR)
2. %3% (%4% IRR)
3. %5% (%6% IRR)

Rules:
- Put each item on a new line using \\r\\n (not commas).
- Include ONLY coin name + volume placeholders (no extra metrics).
- End with a short question/CTA.
- Add 2-3 relevant hashtags.
- Output ONLY the tweet text.`,

  vol: `Create ONE tweet template about the total crypto transaction volume in Iran in the last 24 hours.

Requirements:
- Use placeholders: Total volume = %1% IRR
- No list / no multiple items
- 1-2 short sentences, then a brief question/CTA
- Optional: 0-1 emoji
- Output ONLY the tweet text`,
};

/**
 * Create and post a tweet based on target type
 * @param {string} target - Tweet type ('trends' or 'vol')
 * @param {Array} data - Popular items data
 */
export async function makeTweet(target, data) {
  // Calculate total volume
  let totalVolIRR = 0;
  data.forEach((item) => {
    totalVolIRR += item.irr.volume;
    item.irrfvol = abbreviateNumber(item.irr.volume, 1, false);
  });

  // Generate tweet from AI
  let phrase = await writeTweet(tweetPrompts[target], {
    lineBreak: TWEET_LINE_BREAK,
  });

  if (!phrase) {
    console.warn(`Failed to generate tweet for target: ${target}`);
    return;
  }

  // Replace placeholders with actual data
  phrase = completeTweetPhrase(target, phrase, data, totalVolIRR);

  // Send tweet
  if (phrase) {
    console.log("Tweeting...", phrase);
    await tweet(phrase);
  }
}

/**
 * Create and post content to Telegram
 * @param {string} target - Content type
 * @param {Array} data - Data for the content
 */
export async function makeTelegram(target, data) {
  // Total Trade Volume
  const totalVol = data
    .filter((item) => item.has_iran)
    .reduce((acc, item) => acc + item.irr.volume, 0);

  // Filter Data
  const tokens = data
    .filter((item) => item.has_iran)
    .map((item) => ({
      name: item.name_en,
      price: "$" + numFormat(item.usd.price_avg),
      volume: abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
      icon: item.icon,
    }))
    .slice(0, 10);

  // Yesterday date
  const date = moment().subtract(1, "day").format("YYYY-MM-DD");

  // Create Image
  const image = await createImageFromTemplate(
    "table-coin-" + getRandomTheme(),
    {
      tokens,
      headers: ["Token", "Average Price", "Traded Volume"],
      title: "Daily Recap",
      subtitle: `Total traded volume today: ${abbreviateNumber(
        Math.round(totalVol),
        0,
        true
      )} IRR`,
      lastUpdate: date,
    },
    "daily-coins.jpg"
  );

  if (!image) {
    throw new Error("Image is not generated!");
  }

  // Caption Manually
  const caption = `
📈 Yesterday's Crypto Market Recap | ${date}

📊 Total Traded Volume Today: ${numFormat(Math.round(totalVol))} IRR

🖥 Check the website for more details: 
<a href="https://irancrypto.market/popular/">irancrypto.market</a>

🛎 Follow us on 
<a href="https://instagram.com/irancryptomarket">Instagram @irancryptomarket</a> | 
<a href="https://twitter.com/ircryptomarket">Twitter @ircryptomarket</a> | 
<a href="https://t.me/irancrypto_market">Telegram @irancrypto_market</a>
`;

  // Publish the image on Telegram channel
  await bot.sendPhoto(
    getENV("TELEGRAM_CHANNEL_ID"),
    image,
    {
      caption: caption,
      parse_mode: "html",
      disable_web_page_preview: true,
    },
    {
      filename: `daily-coins-${new Date().toISOString().slice(0, 10)}.jpg`,
      contentType: "image/jpeg",
    }
  );
  console.log("Daily coin recap published successfully on telegram");
}

/**
 * Create and post content to Instagram
 * @param {string} target - Content type ('weekly-coin' or 'monthly-exchange')
 * @param {Array} data - Data for the content
 */
export async function makeInstagram(target, data) {
  if (target === "weekly-coin") {
    // Total trade volume
    const totalVol = data
      .filter((item) => item.has_iran)
      .reduce((acc, item) => acc + item.irr.volume, 0);

    // Filter Data
    const tokens = data
      .filter((item) => item.has_iran)
      .map((item) => ({
        name: item.name_en,
        price: "$" + numFormat(item.usd.price_avg),
        volume: abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
        icon: item.icon,
      }))
      .slice(0, 10);

    // Create Image
    const image = await createImageFromTemplate(
      "table-coin-" + getRandomTheme(),
      {
        tokens,
        headers: ["Token", "Average Price", "Traded Volume"],
        title: "Weekly Recap",
        subtitle: `Total traded volume in past week: ${abbreviateNumber(
          Math.round(totalVol),
          0,
          true
        )} IRR`,
        lastUpdate: new Date().toISOString().slice(0, 10),
      },
      "weekly-coins.jpg"
    );

    if (!image) {
      throw new Error("Image is not generated!");
    }

    // Get Caption from AI
    const caption = await writeCaption(
      "Weekly recap of the most traded tokens on the Iran's cryptocurrency market"
    );

    // Publish the image on IG
    await publishImage(image, caption);
    console.log("Weekly coin recap published on Instagram");
  } else if (target === "monthly-exchange") {
    // Total Trade Volume
    const totalVol = data.reduce((acc, item) => acc + item.volume, 0);

    // Filter Data
    const exchanges = data
      .map((item) => ({
        name: item.name_en,
        volume: numFormat(Math.round(item.volume), 1, true) + " IRR",
        logo: item.logo,
      }))
      .slice(0, 5);

    // Create Image
    const image = await createImageFromTemplate(
      "table-exchange-dark",
      {
        exchanges,
        title: "Exchanges Monthly Recap",
        subtitle: `Total traded volume in past month: ${abbreviateNumber(
          Math.round(totalVol),
          0,
          true
        )} IRR`,
        lastUpdate: new Date().toISOString().slice(0, 10),
      },
      "monthly-exchange.jpg"
    );

    if (!image) {
      throw new Error("Image is not generated!");
    }

    // Get Caption from AI
    const caption = await writeCaption(
      "Monthly recap of the most popular exchanges (based on transactions) in Iran's cryptocurrency market"
    );

    // Publish the image on IG
    await publishImage(image, caption);
    console.log("Monthly recap exchanges published on Instagram");
  }
}

/**
 * Complete the template provided by AI for tweet with actual data
 * @param {string} type - Tweet type ('trends' or 'vol')
 * @param {string} content - Tweet template with placeholders
 * @param {Array} popularItems - Array of popular crypto items
 * @param {number} totalVolIRR - Total volume in IRR
 * @returns {string} Completed tweet text
 */
function completeTweetPhrase(type, content, popularItems, totalVolIRR) {
  if (!content) {
    return "";
  }

  let replacements = {};

  switch (type.toLowerCase()) {
    case "trends":
      // Build replacements for top 3 items (with fallbacks for missing data)
      for (let i = 0; i < 3; i++) {
        const item = safeArrayAccess(popularItems, i, null);
        const nameKey = (i * 2 + 1).toString();
        const volKey = (i * 2 + 2).toString();

        if (item) {
          replacements[nameKey] = item.name_en || "Unknown";
          replacements[volKey] = item.irrfvol || "N/A";
        } else {
          replacements[nameKey] = "N/A";
          replacements[volKey] = "N/A";
        }
      }
      break;

    case "vol":
      replacements["1"] = abbreviateNumber(totalVolIRR, 1, true);
      break;

    default:
      console.warn(`Unknown tweet type: ${type}`);
      return content;
  }

  // Replace placeholders safely
  let result = replacePlaceholders(content, replacements, "N/A");

  // Normalize line breaks and format hashtags consistently
  result = normalizeLineBreaks(result, TWEET_LINE_BREAK);
  result = formatHashtagBlock(result, TWEET_LINE_BREAK);

  return result;
}
