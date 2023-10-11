const fs = require("fs");
const path = require("path");
const { getRecap } = require("./src/api");
const { abbreviateNumber, numFormat } = require("./src/number");
const { isOffline } = require("./src/env");
const { publishImage } = require("./src/instagram");
const { writeCaption } = require("./src/ai");
const { updateLastRunTime } = require("./src/dynamodb");
let puppeteerCore, chromium;
if(!isOffline()){
  // Load puppeteer-core and chromium on AWS Lambda by which chromium is loaded by layer
  // https://github.com/Sparticuz/chromium/tree/master/examples/serverless-with-preexisting-lambda-layer
  puppeteerCore = require("puppeteer-core");
  chromium = require("@sparticuz/chromium");
}
const nodeHtmlToImage = require("node-html-to-image");

exports.handler = async function (event) {
  try {
    // Run weekly recap
    await weeklyRecap();
    // Update last run time on DynamoDB
    updateLastRunTime("instagram", { type: "weekly-recap" });
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
    const image = await createPostFromTemplate(
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
      "weekly.png"
    );

    console.log('generated image:',image);

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

/**
 * Generate an image from a Handlebars template
 * @param {string} templateName
 * @param {object} data
 * @param {string} outputFileName
 * @returns {string} The path to the generated image
 */
async function createPostFromTemplate(templateName, data, outputFileName) {
  try {
    const templatePath = path.join(
      __dirname,
      "static/templates",
      templateName + ".html"
    );
    // Read the template file
    const templateSource = await fs.promises.readFile(templatePath, {
      encoding: "utf-8",
    });
    // Output filedir
    let $outputPath = "writable/ig/";
    //Lambda is writable on /tmp/
    if (!isOffline()) {
      $outputPath = "/tmp/" + $outputPath;
    }
    // Create the directory if it doesn't exist
    if (!fs.existsSync($outputPath)) {
      await fs.promises.mkdir($outputPath, { recursive: true });
    }
    // Change image paths to base64 URIs
    const renderedHtml = await changeImageSrcToBase64(templateSource);
    // AWS Config
    let AWSconf = {};
    if (!isOffline() && chromium) {
      AWSconf = {
        puppeteer: puppeteerCore,
        puppeteerArgs: {
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
          defaultViewport: chromium.defaultViewport,
          args: [
            ...chromium.args,
            "--hide-scrollbars",
            "--disable-web-security",
          ],
        },
      };
    }
    // Generate the image
    await nodeHtmlToImage({
      html: renderedHtml,
      content: data, // It already using Handlebars
      output: $outputPath + outputFileName,
      transparent: true,
      ...AWSconf,
    });
    return $outputPath + outputFileName;
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Changing local file paths in <img> tags to base64 URIs
 * @param {string} htmlContent
 * @returns {string}
 */
async function changeImageSrcToBase64(htmlContent) {
  try {
    const baseDir = path.join(__dirname, "static", "templates");
    // Regular expression to match <img> tags with local file paths
    const imgTagRegex = /<img[^>]*src=["']((?!https?:\/\/)[^"']+)["'][^>]*>/gi;

    // Function to replace matched <img> tags with base64 URIs
    const replaceImgTags = async (match) => {
      try {
        // Extract the src attribute value
        const srcMatch = /src=["']((?!https?:\/\/)[^"']+)["']/i.exec(match);
        if (!srcMatch) {
          return match; // Return the original <img> tag if no src attribute is found
        }
        const imagePath = srcMatch[1];
        // Skip if the image path is not well-formed
        if (imagePath.startsWith("{{")) {
          return match;
        }
        // Read the image file
        const imagePathAbsolute = path.join(baseDir, imagePath);
        const imageBuffer = await fs.promises.readFile(imagePathAbsolute);
        const base64Image = Buffer.from(imageBuffer).toString("base64");
        const mimeType = path.extname(imagePath).replace(".", "");
        // Include any other attributes from the original <img> tag
        return match.replace(
          /src=["']((?!https?:\/\/)[^"']+)["']/i,
          `src="data:image/${mimeType};base64,${base64Image}"`
        );
      } catch (error) {
        console.error(
          `Error processing image "${imagePath}": ${error.message}`
        );
        return match; // Return the original <img> tag if there was an error
      }
    };

    // Replace <img> tags with base64 URIs
    return htmlContent.replaceAsync(imgTagRegex, replaceImgTags);
  } catch (error) {
    throw error;
  }
}

// Helper function to add asynchronous replace functionality to String
String.prototype.replaceAsync = async function (regex, asyncFn) {
  const promises = [];

  this.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });

  const replacedValues = await Promise.all(promises);
  return this.replace(regex, () => replacedValues.shift());
};

weeklyRecap().then().catch(console.log);
