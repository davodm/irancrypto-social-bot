const { getRecap } = require("./src/api");
const { abbreviateNumber, numFormat } = require("./src/number");
const { publishImage } = require("./src/instagram");
const { writeCaption } = require("./src/ai");
const { updateLastRunTime } = require("./src/dynamodb");
const { createImageFromTemplate, getRandomTheme } = require("./src/html");

exports.coinrecap = async function (event, context) {
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

exports.exchangerecap = async function (event, context) {
  // Prevent timeout from waiting event loop - Chromium
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // Run monthly recap on exchanges
    //await monthlyExchangeRecap();
    // Update last run time on DynamoDB
    //updateLastRunTime("instagram", { type: "monthly-exchangerecap" });
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
      "table-" + getRandomTheme(),
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
      "weekly.jpg"
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
        headers:["Token","Average Price","Traded Volume"],
        title: "Weekly Recap",
        subtitle: `Total traded volume in past week: ${abbreviateNumber(
          Math.round(totalVol),
          0,
          true
        )} IRR`,
        lastUpdate: new Date().toISOString().slice(0, 10),
      },
      "weekly.jpg"
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