import { getRecap } from "./src/api.js";
import { abbreviateNumber, numFormat } from "./src/number.js";
import { publishImage } from "./src/instagram.js";
import { writeCaption } from "./src/ai.js";
import { updateLastRunTime } from "./src/dynamodb.js";
import { createImageFromTemplate, getRandomTheme } from "./src/html.js";

/**
 * Weekly recap of the most traded tokens on the Iran's cryptocurrency market to publish on Instagram
 * 
 * @param {*} event 
 * @param {*} context 
 */
export const coinrecap = async function (event, context) {
  // Prevent timeout from waiting event loop - Chromium
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // Run weekly recap on tokens
    await weeklyCoinRecap();
    // Update last run time on DynamoDB
    updateLastRunTime("instagram", { type: "weekly-coinrecap" });
    // Log
    console.log("Weekly recap published successfully on instagram!");
  } catch (err) {
    console.error(err);
  }
};

/**
 * Monthly recap of the most popular exchanges (based on transactions) in Iran's cryptocurrency market to publish on Instagram
 * @param {*} event 
 * @param {*} context 
 */
export const exchangerecap = async function (event, context) {
  // Prevent timeout from waiting event loop - Chromium
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // Run monthly recap on exchanges
    await monthlyExchangeRecap();
    // Update last run time on DynamoDB
    updateLastRunTime("instagram", { type: "monthly-exchangerecap" });
    // Log
    console.log("Weekly recap published successfully on instagram!");
  } catch (err) {
    console.error(err);
  }
};

/**
 * Generate a tokens weekly recap image and publish it on Instagram
 */
async function weeklyCoinRecap() {
  try {
    // Get Data from API
    const data = await getRecap("coin","weekly");
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
      "table-coin-" + getRandomTheme(),
      {
        tokens,
        headers:["Token","Average Price","Traded Volume"],
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
  } catch (err) {
    throw err;
  }
}

/**
 * Generate an exchange monthly recap image and publish it on Instagram
 */
async function monthlyExchangeRecap() {
  try {
    // Get Data from API
    const data = await getRecap("exchange","monthly");
    // Total Trade Volume
    const totalVol = data.reduce((acc, item) => acc + item.volume, 0);
    // Filter Data
    const exchanges = data.map((item) => {
        return {
          name: item.name_en,
          volume:
          numFormat(Math.round(item.volume), 1, true) + " IRR",
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
  } catch (err) {
    throw err;
  }
}