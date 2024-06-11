import { tweet } from "./twitter.js";
import { writeTweet } from "./ai.js";
import { abbreviateNumber, numFormat } from "./number.js";
import { createImageFromTemplate, getRandomTheme } from "./html.js";
import { getENV } from "./env.js";
import TelegramBot from "node-telegram-bot-api";
import moment from "moment";

const bot = new TelegramBot(getENV("TELEGRAM_BOT_TOKEN"));

// AI prompts
const tweetPrompts = {
  trends: `
  Write about the top 3 crypto trends in the past 24 hours in Iran.
  Include only the name and volume in IRR currency and format each trend on a new line (\r\n) for clarity.

  # Example 1:
  Top 3 cryptos in Iran yesterday:
  1. %1% (%2% IRR)
  2. %3% (%4% IRR)
  3. %5% (%6% IRR)
  Which one did you trade? #Irancrypto #CryptoMarket

  # Example 2:
  Yesterday's crypto buzz in Iran:
  1. %1% saw %2% IRR
  2. %3% hit %4% IRR
  3. %5% reached %6% IRR
  Did you cash in? #CryptoMarket #TopCrypto

  # Example 3:
  Top 3 yesterday's #CryptoTrends in #Iran:
  1. %1%: Trading volume of %2% IRR
  2. %3%: Trading volume of %4% IRR
  3. %5%: Trading volume of %6% IRR
  Stay tuned for more updates! #CryptoNews #IranCrypto`,
  
  vol: `Write a tweet template without listing about the total volume of crypto transactions in Iran in the past 24 hours, all in IRR currency.`,
};

export async function makeTweet(target, data) {
  // Calculate total Vol
  let totalVolIRR = 0;
  data.forEach((item) => {
    totalVolIRR += item.irr.volume;
    item.irrfvol = abbreviateNumber(item.irr.volume, 1, false); //Formatted version
  });

  // Make Tweet
  let phrase = await writeTweet(tweetPrompts[target]);
  phrase = completeTweetPhrase(target, phrase, data, totalVolIRR);

  // Send tweet
  if (phrase) {
    console.log("Tweeting...", phrase);
    await tweet(phrase);
  }
}

export async function makeTelegram(target, data) {
  // Total Trade Volume
  const totalVol = data
    .filter((item) => item.has_iran)
    .reduce((acc, item) => acc + item.irr.volume, 0);
  // Filter Data
  const tokens = data
    .filter((item) => item.has_iran)
    .map((item) => {
      return {
        name: item.name_en,
        price: "$" + numFormat(item.usd.price_avg),
        volume: abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
        icon: item.icon,
      };
    })
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

export async function makeInstagram(target, data) {
  if (target === "weekly-coin") {
    // Total trade volume
    const totalVol = data
      .filter((item) => item.has_iran)
      .reduce((acc, item) => acc + item.irr.volume, 0);
    // Filter Data
    const tokens = data
      .filter((item) => item.has_iran)
      .map((item) => {
        return {
          name: item.name_en,
          price: "$" + numFormat(item.usd.price_avg),
          volume:
            abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
          icon: item.icon,
        };
      })
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
      .map((item) => {
        return {
          name: item.name_en,
          volume: numFormat(Math.round(item.volume), 1, true) + " IRR",
          logo: item.logo,
        };
      })
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
 * Complete the template provided by AI for tweet
 * @param {string} $type
 * @param {string} $content
 * @param {object[]} $popularItems
 * @param {number} $totalVolIRR
 * @returns {string}
 */
function completeTweetPhrase($type, $content, $popularItems, $totalVolIRR) {
  switch ($type.toLowerCase()) {
    case "trends":
      let placeholderIndex = 1;
      for (let i = 0; i < 3; i++) {
        //Name
        $content = $content.replace(
          `%${placeholderIndex}%`,
          $popularItems[i].name_en
        );
        placeholderIndex++;
        //Vol
        $content = $content.replace(
          `%${placeholderIndex}%`,
          $popularItems[i].irrfvol
        );
        placeholderIndex++;
      }
      break;
    case "vol":
      $content = $content.replace(
        `%1%`,
        abbreviateNumber($totalVolIRR, 1, true)
      );
      break;
    default:
      throw new Error("Template could not recognized");
      break;
  }
  return lineBreak($content);
}

/**
 * Line break before hashtag
 * @param {string} inputText
 * @returns {string}
 */
function lineBreak(inputText) {
  // Find the hashtags
  const hashtags = findHashtags(inputText);
  // If there is no second last hashtag or no hashtags at all
  if (hashtags.count == 0 || hashtags.atEnd.length == 0) {
    return inputText;
  }
  // Find the index of the first last hashtag
  let hashtagIndex = inputText.indexOf(hashtags.atEnd[0]);
  // If there is no index of the second last hashtag, return the input text
  if (hashtagIndex === -1) {
    return inputText;
  }
  // Insert a line break before the first hashtag
  let formattedText = inputText;
  formattedText =
    formattedText.slice(
      0,
      inputText[hashtagIndex - 1] === " " ? hashtagIndex - 1 : hashtagIndex
    ) + // If there is a space before the hashtag, remove it
    "\n\n" +
    formattedText.slice(hashtagIndex);
  return formattedText;
}

/**
 * Find hashtags in the content
 * @param {string} content
 * @returns {object}
 */
function findHashtags(content) {
  const hashtags = content.match(/#\w+/g) || [];
  let lastLineStartIndex = content.lastIndexOf("\n") + 1;
  // If there's no newline, use the splitIndex based on content length
  if (lastLineStartIndex === 0) {
    lastLineStartIndex = Math.floor(content.length * 0.75); // Adjust the 0.75 as needed
  }
  const hashtagsInText = [];
  const hashtagsAtEnd = [];

  for (const hashtag of hashtags) {
    const hashtagIndex = content.indexOf(hashtag);
    if (hashtagIndex >= lastLineStartIndex) {
      hashtagsAtEnd.push(hashtag);
    } else {
      hashtagsInText.push(hashtag);
    }
  }

  return {
    count: hashtags.length,
    inText: hashtagsInText,
    atEnd: hashtagsAtEnd,
  };
}
