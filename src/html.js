import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import { getENV, isOffline } from "./env.js";
// Load puppeteer-core and chromium on AWS Lambda by which chromium is loaded by layer
// https://github.com/Sparticuz/chromium/tree/master/examples/serverless-with-preexisting-lambda-layer
// Puppeteer-core should be matched with the version of Chromium: https://pptr.dev/supported-browsers
import puppeteerCore from "puppeteer-core";
let chromium;
// __dirname is not defined in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate an image from an HTML + Parsing via Handlebars
 * @param {string} templateName
 * @param {object} data
 * @param {string} outputFileName
 * @returns {Promise<string>} The path to the generated image
 */
export async function createImageFromTemplate(
  templateName,
  data,
  outputFileName
) {
  // Initialize browser
  let browser = null;
  try {
    // Render Template to HTML
    const template = await renderTemplate(templateName, data, true);
    const optArgs=[
      '--no-zygote',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--force-color-profile=srgb',
      '--hide-scrollbars',
    ];

    // Load Chromium on AWS Lambda
    if (!getENV("CHROMIUM", null)) {
      // Get Chromium data on AWS Lambda layer
      chromium = await import("@sparticuz/chromium");
      chromium = chromium.default; // Get default export
      browser = await puppeteerCore.launch({
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        args: chromium.args.concat(optArgs),
      });
      // Define Chromium path manually via .env
    } else {
      browser = await puppeteerCore.launch({
        executablePath: getENV("CHROMIUM", null),
        args: optArgs,
      });
    }
    const page = await browser.newPage();
    // Set viewport to increase quality
    await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 3 });
    // Set HTML Content
    await page.setContent(template);
    // Wait for any asynchronous operations to complete
    // await page.waitForTimeout(1000);
    // Take a screenshot of the entire page
    const element = await page.$("body");
    // Output filedir on Lambda /tmp/
    const $outputPath = isOffline() ? "./" : "/tmp/writable/ig/";
    // Create the directory if it doesn't exist
    if (!fs.existsSync($outputPath)) {
      await fs.promises.mkdir($outputPath, { recursive: true });
    }
    // Take Screenshot and save it to file
    await element.screenshot({
      type: "jpeg",
      quality: 100,
      omitBackground: true,
      path: $outputPath + outputFileName, // Write on the disk
    });
    return $outputPath + outputFileName;
  } catch (error) {
    console.error(`Error generating image`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Load a HTML template and render it with handlebars and convert images to base64
 * @param {string} templateName
 * @param {object} data
 * @param {boolean} convertImageToBase64
 * @returns {Promise<string>}
 */
export async function renderTemplate(
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
 * @returns {Promise<string>}
 */
async function changeImageSrcToBase64(htmlContent) {
  try {
    const baseDir = path.join(__dirname, "../static", "templates");
    // Regular expression to match <img> tags with local file paths
    const imgTagRegex = /<img[^>]*src=["']((?!https?:\/\/)[^"']+)["'][^>]*>/gi;

    // Function to replace matched <img> tags with base64 URIs or full URLs
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

        // For local files, convert to base64
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
export function getRandomTheme() {
  const themes = ["black", "light", "dark"];
  const randomIndex = Math.floor(Math.random() * themes.length);
  return themes[randomIndex];
}
