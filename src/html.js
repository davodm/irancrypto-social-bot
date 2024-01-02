const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");
const { getENV } = require("./env");
// Load puppeteer-core and chromium on AWS Lambda by which chromium is loaded by layer
// https://github.com/Sparticuz/chromium/tree/master/examples/serverless-with-preexisting-lambda-layer
const puppeteerCore = require("puppeteer-core");
let chromium;

/**
 * Generate an image from an HTML + Parsing via Handlebars
 * @param {string} templateName
 * @param {object} data
 * @param {string} outputFileName
 * @returns {string} The path to the generated image
 */
async function createImageFromTemplate(templateName, data, outputFileName) {
  try {
    // Render Template to HTML
    const template = await renderTemplate(templateName, data, true);
    // Open Browser
    let browser;
    // Load Chromium on AWS Lambda
    if (!getENV("CHROMIUM", null)) {
      // Get Chromium data on AWS Lambda layer
      chromium = await import("@sparticuz/chromium");
      browser = await puppeteerCore.launch({
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        args: [
          ...chromium.args,
          "--force-color-profile=srgb",
          "--hide-scrollbars",
          "--disable-web-security",
          "--no-sandbox",
        ],
      });
      // Define Chromium path manually via .env
    } else {
      browser = await puppeteerCore.launch({
        executablePath: getENV("CHROMIUM", null),
        args: [
          "--force-color-profile=srgb",
          "--disable-web-security",
          "--no-sandbox",
        ],
      });
    }
    const page = await browser.newPage();
    // Set viewport to increase quality
    await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 3 });
    // await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36");
    // Set HTML Content
    await page.setContent(template);
    // Wait for any asynchronous operations to complete
    //await page.waitForTimeout(1000);
    // Take a screenshot of the entire page
    const element = await page.$("body");
    // Output filedir on Lambda /tmp/
    //let $outputPath = "/tmp/writable/ig/";
    let $outputPath = "./";
    // Create the directory if it doesn't exist
    if (!fs.existsSync($outputPath)) {
      await fs.promises.mkdir($outputPath, { recursive: true });
    }
    // Take Screenshot and save it to file
    await element.screenshot({
      omitBackground: true,
      path: $outputPath + outputFileName, // Write on the disk
    });
    // Close the browser
    //await page.close();
    const pages = await browser.pages();
    for (let i = 0; i < pages.length; i++) {
      await pages[i].close();
    }
    await browser.close();
    return $outputPath + outputFileName;
  } catch (error) {
    throw error;
  }
}

async function renderTemplate(
  templateName,
  data,
  convertImageToBase64 = false
) {
  const templatePath = path.join(
    __dirname,
    "../static/templates",
    templateName + ".html"
  );
  // Read the template file
  let template = await fs.promises.readFile(templatePath, {
    encoding: "utf-8",
  });
  // Handlebars
  if (data && typeof data === "object") {
    template = Handlebars.compile(template)(data);
  }
  // Change image paths to base64 URIs
  if (convertImageToBase64) {
    template = await changeImageSrcToBase64(template);
  }
  return template;
}

/**
 * Changing local file paths in <img> tags to base64 URIs
 * @param {string} htmlContent
 * @returns {string}
 */
async function changeImageSrcToBase64(htmlContent) {
  try {
    const baseDir = path.join(__dirname, "../static", "templates");
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
        console.error(`Error processing image: ${error.message}`);
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

/**
 * Decide whether to use a dark or light theme
 * @returns {string} "dark"/"light"/"black"
 */
function getRandomTheme() {
  const themes = ["black", "light", "dark"];
  const randomIndex = Math.floor(Math.random() * themes.length);
  return themes[randomIndex];
}

module.exports = {
  createImageFromTemplate,
  renderTemplate,
  getRandomTheme,
};
