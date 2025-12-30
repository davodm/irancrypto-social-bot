import { tweet } from "./twitter.js";
import { publishImage } from "./instagram.js";
import { writeTweet, writeCaption } from "./ai/index.js";
import { abbreviateNumber, numFormat } from "./number.js";
import { createImageFromTemplate, getRandomTheme } from "./html.js";
import { getENV } from "./env.js";
import TelegramBot from "node-telegram-bot-api";
import moment from "moment";
import { captureError } from "./sentry.js";

const bot = new TelegramBot(getENV("TELEGRAM_BOT_TOKEN"));

// Default line break style for tweets (CRLF for Twitter compatibility)
const TWEET_LINE_BREAK = "\r\n";

/**
 * Build dynamic AI prompt for tweets with real data and date context
 * @param {string} type - Tweet type ('trends' or 'vol')
 * @param {Array} data - Popular items data
 * @param {number} totalVolIRR - Total volume in IRR
 * @returns {string} Dynamic prompt with real data
 */
function buildTweetPrompt(type, data, totalVolIRR) {
  const today = moment().format("MMMM D, YYYY");
  const dayOfWeek = moment().format("dddd");

  if (type === "trends") {
    const top3 = data.slice(0, 3).map((item, i) => ({
      rank: i + 1,
      name: item.name_en,
      symbol: item.symbol,
      volume: abbreviateNumber(item.irr.volume, 1, true),
    }));

    return `Write a creative tweet about today's top 3 crypto trends in Iran.

DATE: ${dayOfWeek}, ${today}
PERIOD: Last 24 hours

TOP 3 BY TRADING VOLUME:
${top3.map(c => `${c.rank}. ${c.name} (${c.symbol}) - ${c.volume} IRR`).join("\n")}

TOTAL MARKET VOLUME: ${abbreviateNumber(totalVolIRR, 1, true)} IRR

Make it engaging - highlight the leader, mention the rankings, ask a question or add insight.
Vary your style from previous posts - be creative!`;
  }

  if (type === "vol") {
    return `Write a creative tweet about Iran's crypto trading volume today.

DATE: ${dayOfWeek}, ${today}
PERIOD: Last 24 hours
TOTAL VOLUME: ${abbreviateNumber(totalVolIRR, 1, true)} IRR

Share this volume milestone creatively. Add context, ask a question, or note the market activity.
Keep it fresh and different from typical volume announcements!`;
  }

  return "";
}

/**
 * Create and post a tweet based on target type
 * @param {string} target - Tweet type ('trends' or 'vol')
 * @param {Array} data - Popular items data
 */
export async function makeTweet(target, data) {
  try {
    // Calculate total volume - use BigInt to avoid precision issues with large numbers
    const totalVolIRR = Number(data.reduce((acc, item) => acc + BigInt(Math.round(item.irr?.volume || 0)), 0n));

    // Build dynamic prompt with real data and date context
    const prompt = buildTweetPrompt(target, data, totalVolIRR);

    if (!prompt) {
      console.warn(`Unknown tweet target: ${target}`);
      return;
    }

    // Generate tweet from AI with real data
    const phrase = await writeTweet(prompt, {
      lineBreak: TWEET_LINE_BREAK,
    });

    if (!phrase) {
      console.warn(`Failed to generate tweet for target: ${target}`);
      return;
    }

    // Send tweet (no placeholder replacement needed - AI has real data)
    console.log("Tweeting...", phrase);
    await tweet(phrase);
  } catch (error) {
    captureError(error, {
      tags: {
        worker: 'content',
        function: 'makeTweet',
        target: target
      },
      extra: {
        dataLength: data?.length || 0
      }
    });
    throw error; // Re-throw to maintain Lambda error handling
  }
}

/**
 * Create and post content to Telegram
 * @param {string} target - Content type
 * @param {Array} data - Data for the content
 */
export async function makeTelegram(target, data) {
  try {
    // Total Trade Volume - use BigInt to avoid precision issues with large numbers
    const totalVol = data
      .filter((item) => item.has_iran)
      .reduce((acc, item) => acc + BigInt(Math.round(item.irr.volume || 0)), 0n);

    // Filter Data
    const tokens = data
      .filter((item) => item.has_iran)
      .map((item) => ({
        name: item.name_en,
        price: "$" + numFormat(item.usd.price),
        volume: abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
        icon: item.icon.startsWith('http') ? item.icon : `https://irancrypto.market/${item.icon}`,
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
        subtitle: `Total traded volume (24h): ${abbreviateNumber(
          Number(totalVol),
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

📊 Total Traded Volume (24h): ${numFormat(Number(totalVol))} IRR

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
  } catch (error) {
    captureError(error, {
      tags: {
        worker: 'content',
        function: 'makeTelegram',
        target: target
      },
      extra: {
        dataLength: data?.length || 0
      }
    });
    throw error; // Re-throw to maintain Lambda error handling
  }
}

/**
 * Build dynamic AI prompt for Instagram captions with real data and date context
 * @param {string} type - Caption type ('weekly-coin' or 'monthly-exchange')
 * @param {Array} data - Content data
 * @param {number} totalVol - Total volume
 * @returns {string} Dynamic prompt with real data
 */
function buildInstagramPrompt(type, data, totalVol) {
  const today = moment().format("MMMM D, YYYY");
  const weekStart = moment().subtract(7, "days").format("MMM D");
  const weekEnd = moment().format("MMM D, YYYY");
  const monthName = moment().format("MMMM YYYY");

  if (type === "weekly-coin") {
    const top5 = data.slice(0, 5).map((item, i) => ({
      rank: i + 1,
      name: item.name_en,
      volume: abbreviateNumber(item.irr?.volume || 0, 1, true),
    }));

    const leader = top5[0];
    const leaderShare = totalVol > 0 ? Math.round((data[0]?.irr?.volume || 0) / totalVol * 100) : 0;

    return `Write an Instagram caption for our weekly crypto market recap in Iran.

DATE: ${today}
PERIOD: Week of ${weekStart} - ${weekEnd}

TOP 5 TOKENS BY VOLUME:
${top5.map(t => `${t.rank}. ${t.name} - ${t.volume} IRR`).join("\n")}

HIGHLIGHTS:
- Total weekly volume: ${abbreviateNumber(totalVol, 1, true)} IRR
- ${leader.name} dominated with ${leaderShare}% of total volume
- These are the most traded tokens this week

Make it insightful and engaging. Mention the week dates, highlight the leader, share a market insight.`;
  }

  if (type === "monthly-exchange") {
    const top5 = data.slice(0, 5).map((item, i) => ({
      rank: i + 1,
      name: item.name_en,
      volume: abbreviateNumber(item.volume || 0, 1, true),
    }));

    const leader = top5[0];
    const leaderShare = totalVol > 0 ? Math.round((data[0]?.volume || 0) / totalVol * 100) : 0;

    return `Write an Instagram caption for our monthly exchange performance recap in Iran.

DATE: ${today}
PERIOD: ${monthName}

TOP 5 EXCHANGES BY VOLUME:
${top5.map(e => `${e.rank}. ${e.name} - ${e.volume} IRR`).join("\n")}

HIGHLIGHTS:
- Total monthly volume: ${abbreviateNumber(totalVol, 1, true)} IRR
- ${leader.name} leads with ${leaderShare}% market share
- These exchanges processed the most trades this month

Make it insightful and engaging. Mention the month, highlight the competition, share exchange trends.`;
  }

  return "";
}

/**
 * Create and post content to Instagram
 * @param {string} target - Content type ('weekly-coin' or 'monthly-exchange')
 * @param {Array} data - Data for the content
 */
export async function makeInstagram(target, data) {
  try {
    if (target === "weekly-coin") {
      // Total trade volume - use BigInt to avoid precision issues with large numbers
      const totalVol = Number(data
        .filter((item) => item.has_iran)
        .reduce((acc, item) => acc + BigInt(Math.round(item.irr.volume || 0)), 0n));

      // Filter Data
      const filteredData = data.filter((item) => item.has_iran);
      const tokens = filteredData
        .map((item) => ({
          name: item.name_en,
          price: "$" + numFormat(item.usd.price),
          volume: abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
          icon: item.icon.startsWith('http') ? item.icon : `https://irancrypto.market/${item.icon}`,
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

      // Get Caption from AI with real data and date context
      const prompt = buildInstagramPrompt("weekly-coin", filteredData, totalVol);
      const caption = await writeCaption(prompt);

      // Publish the image on IG
      await publishImage(image, caption);
      console.log("Weekly coin recap published on Instagram");
    } else if (target === "monthly-exchange") {
      // Total Trade Volume - use BigInt to avoid precision issues with large numbers
      const totalVol = Number(data.reduce((acc, item) => acc + BigInt(Math.round(item.volume || 0)), 0n));

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

      // Get Caption from AI with real data and date context
      const prompt = buildInstagramPrompt("monthly-exchange", data, totalVol);
      const caption = await writeCaption(prompt);

      // Publish the image on IG
      await publishImage(image, caption);
      console.log("Monthly recap exchanges published on Instagram");
    }
  } catch (error) {
    captureError(error, {
      tags: {
        worker: 'content',
        function: 'makeInstagram',
        target: target
      },
      extra: {
        dataLength: data?.length || 0
      }
    });
    throw error; // Re-throw to maintain Lambda error handling
  }
}

