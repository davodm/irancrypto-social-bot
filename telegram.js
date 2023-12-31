const { getRecap } = require("./src/api");
const { abbreviateNumber, numFormat } = require("./src/number");
const { updateLastRunTime } = require("./src/dynamodb");
const { createImageFromTemplate, getRandomTheme } = require("./src/html");
const { getENV } = require("./src/env");
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(getENV("TELEGRAM_BOT_TOKEN"));

exports.handler = async function (event, context) {
  // Prevent timeout from waiting event loop - Chromium
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // Run daily recap
    await dailyRecap();
    // Update last run time on DynamoDB
    updateLastRunTime("telegram", { type: "daily-recap" });
    // Log
    console.log("Daily recap published successfully on telegram!");
  } catch (err) {
    console.error(err);
  }
};

/**
 * Generate a weekly recap image and publish it on Instagram
 */
async function dailyRecap() {
  try {
    // Get Data from API
    const data = await getRecap("daily");
    // USDT Token
    // const usd= data.find((item) => item.has_iran && item.symbol === 'USDT');
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
          volume:
            abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
          icon: item.icon,
        };
      })
      .slice(0, 10);

    // Create Image
    const image = await createImageFromTemplate(
      "table-" + getRandomTheme(),
      {
        tokens,
        headers: ["Token", "Average Price", "Traded Volume"],
        title: "Daily Recap",
        subtitle: `Total traded volume today: ${abbreviateNumber(
          Math.round(totalVol),
          0,
          true
        )} IRR`,
        lastUpdate: new Date().toISOString().slice(0, 10),
      },
      "daily.jpg"
    );

    console.log("generated image:", image);

    if (!image) {
      throw new Error("Image not generated!");
    }
    // Get Caption from AI
    const caption = `
📈 Today's Crypto Market Recap | ${new Date().toISOString().slice(0, 10)}

📊 Total Traded Volume Today: ${numFormat(Math.round(totalVol))} IRR

Source: @irancrypto_market
Follow us on <a href="http://instagram.com/irancryptomarket">Instagram @irancryptomarket</a>
`;

    // Publish the image on Telegram channel
    await bot.sendPhoto(getENV("TELEGRAM_CHANNEL_ID"), image, {
      caption: caption,
      parse_mode: "html",
      disable_web_page_preview: true,
    });
  } catch (err) {
    throw err;
  }
}
