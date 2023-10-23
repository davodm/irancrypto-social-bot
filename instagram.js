const { getRecap } = require("./src/api");
const { abbreviateNumber, numFormat } = require("./src/number");
const { publishImage } = require("./src/instagram");
const { writeCaption } = require("./src/ai");
const { updateLastRunTime } = require("./src/dynamodb");
const { createImageFromTemplate } = require("./src/html");

exports.handler = async function (event, context) {
  // Prevent timeout from waiting event loop - Chromium
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    // Run weekly recap
    await weeklyRecap();
    // Update last run time on DynamoDB
    updateLastRunTime("instagram", { type: "weekly-recap" });
    // Log
    console.log("Weekly recap published successfully on instagram!");
  } catch (err) {
    console.error(err);
  }
};

/**
 * Generate a weekly recap image and publish it on Instagram
 */
async function weeklyRecap() {
  try {
    // Get Data from API
    const data = await getRecap("weekly");
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
      "table-light",
      {
        tokens,
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

    console.log("generated image:", image);

    if (!image) {
      throw new Error("Image not generated!");
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
