#!/usr/bin/env node

// Now import the modules that depend on environment variables
import { writeTweet, writeCaption } from "./src/ai/index.js";
import { getPopular, getExchanges, getRecap } from "./src/api.js";
import { abbreviateNumber, numFormat } from "./src/number.js";
import { createImageFromTemplate } from "./src/html.js";
import moment from "moment";

/**
 * Comprehensive test runner for IranCrypto bot functionality
 * Run with: npm run test:functional <test-type>
 *
 * Available test types:
 * - api: Test API endpoints functionality (runs first)
 * - caption: Generate sample captions for Instagram/Twitter using AI
 * - image: Generate images without posting (recaps, exchanges)
 * - all: Run all tests in logical order (default)
 * - help: Show this help message
 */

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';

async function runTests() {
  console.log("🧪 IranCrypto Bot Test Runner");
  console.log("================================\n");

  try {
    switch (testType.toLowerCase()) {
      case 'caption':
        await testCaptionGeneration();
        break;
      case 'api':
        await testAPI();
        break;
      case 'image':
        await testImageGeneration();
        break;
      case 'all':
        // Run tests in logical order: API first, then content generation, then image generation
        await testAPI();
        await testCaptionGeneration();
        await testImageGeneration();
        break;
      case 'help':
        showHelp();
        break;
      default:
        // Default behavior: run all tests in logical order
        await testAPI();
        await testCaptionGeneration();
        await testImageGeneration();
        break;
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

/**
 * Test caption generation for Instagram and Twitter
 * Uses REAL API data for authentic content generation testing
 */
async function testCaptionGeneration() {
  console.log("📝 Testing Caption Generation (Real API Data)");
  console.log("----------------------------------------------");

  try {
    // Fetch real data from API
    console.log("\n📊 Fetching real data from IranCrypto API...");
    const popularData = await getPopular();
    const weeklyData = await getRecap("coin", "weekly");
    const monthlyExchangeData = await getRecap("exchange", "monthly");

    console.log(`✅ Loaded: ${popularData.length} popular coins, ${weeklyData.length} weekly coins, ${monthlyExchangeData.length} exchanges`);

    // Calculate real values
    const totalDailyVol = popularData.reduce((acc, item) => acc + (item.irr?.volume || 0), 0);
    const totalWeeklyVol = weeklyData.filter(i => i.has_iran).reduce((acc, item) => acc + (item.irr?.volume || 0), 0);
    const totalMonthlyVol = monthlyExchangeData.reduce((acc, item) => acc + (item.volume || 0), 0);

    // Date context
    const today = moment().format("MMMM D, YYYY");
    const dayOfWeek = moment().format("dddd");
    const weekStart = moment().subtract(7, "days").format("MMM D");
    const weekEnd = moment().format("MMM D, YYYY");
    const monthName = moment().format("MMMM YYYY");

    // ===== TWITTER TESTS =====

    // Test 1: Twitter Trends (Daily Top 3)
    console.log("\n🐦 Testing Twitter Trends Caption (Real Data):");
    const top3 = popularData.slice(0, 3);
    const trendsTweet = await writeTweet(`Write a creative tweet about today's top 3 crypto trends in Iran.

DATE: ${dayOfWeek}, ${today}
PERIOD: Last 24 hours

TOP 3 BY TRADING VOLUME:
${top3.map((c, i) => `${i+1}. ${c.name_en} (${c.symbol}) - ${abbreviateNumber(c.irr?.volume || 0, 1, true)} IRR`).join("\n")}

TOTAL MARKET VOLUME: ${abbreviateNumber(totalDailyVol, 1, true)} IRR

Make it engaging - highlight the leader, mention the rankings, ask a question or add insight.`, { lineBreak: "\r\n" });
    console.log("Result:", trendsTweet || "❌ Failed");

    // Test 2: Twitter Volume (Daily Total)
    console.log("\n🐦 Testing Twitter Volume Caption (Real Data):");
    const volTweet = await writeTweet(`Write a creative tweet about Iran's crypto trading volume today.

DATE: ${dayOfWeek}, ${today}
PERIOD: Last 24 hours
TOTAL VOLUME: ${abbreviateNumber(totalDailyVol, 1, true)} IRR

Share this volume milestone creatively. Add context, ask a question, or note the market activity.`);
    console.log("Result:", volTweet || "❌ Failed");

    // ===== INSTAGRAM TESTS =====

    // Test 3: Instagram Weekly Coin Recap
    console.log("\n📸 Testing Instagram Weekly Recap Caption (Real Data):");
    
    // Use popular data as fallback if weekly data is empty
    const weeklySource = weeklyData.length > 0 ? weeklyData.filter(i => i.has_iran) : popularData;
    const weeklyVolSource = weeklyData.length > 0 ? totalWeeklyVol : totalDailyVol;
    const top5Weekly = weeklySource.slice(0, 5);
    const weeklyLeader = top5Weekly[0];
    const weeklyLeaderShare = weeklyVolSource > 0 ? Math.round((weeklyLeader?.irr?.volume || 0) / weeklyVolSource * 100) : 0;

    if (weeklyData.length === 0) {
      console.log("⚠️ Weekly API data empty, using daily data as sample");
    }

    const weeklyCaption = await writeCaption(`Write an Instagram caption for our weekly crypto market recap in Iran.

DATE: ${today}
PERIOD: Week of ${weekStart} - ${weekEnd}

TOP 5 TOKENS BY VOLUME:
${top5Weekly.map((t, i) => `${i+1}. ${t.name_en} - ${abbreviateNumber(t.irr?.volume || 0, 1, true)} IRR`).join("\n")}

HIGHLIGHTS:
- Total weekly volume: ${abbreviateNumber(weeklyVolSource, 1, true)} IRR
- ${weeklyLeader?.name_en || "Leader"} dominated with ${weeklyLeaderShare}% of total volume

Make it insightful and engaging. Mention the week dates, highlight the leader, share a market insight.`);
    console.log("Result:", weeklyCaption || "❌ Failed");

    // Test 4: Instagram Monthly Exchange Recap
    console.log("\n📸 Testing Instagram Monthly Exchange Recap Caption (Real Data):");
    const top5Exchanges = monthlyExchangeData.slice(0, 5);
    const exchangeLeader = top5Exchanges[0];
    const exchangeLeaderShare = totalMonthlyVol > 0 ? Math.round((exchangeLeader?.volume || 0) / totalMonthlyVol * 100) : 0;

    const exchangeCaption = await writeCaption(`Write an Instagram caption for our monthly exchange performance recap in Iran.

DATE: ${today}
PERIOD: ${monthName}

TOP 5 EXCHANGES BY VOLUME:
${top5Exchanges.map((e, i) => `${i+1}. ${e.name_en} - ${abbreviateNumber(e.volume || 0, 1, true)} IRR`).join("\n")}

HIGHLIGHTS:
- Total monthly volume: ${abbreviateNumber(totalMonthlyVol, 1, true)} IRR
- ${exchangeLeader?.name_en || "Leader"} leads with ${exchangeLeaderShare}% market share

Make it insightful and engaging. Mention the month, highlight the competition, share exchange trends.`);
    console.log("Result:", exchangeCaption || "❌ Failed");

    console.log("\n✅ Caption generation tests completed with real data!");

  } catch (error) {
    console.error("❌ Caption generation test failed:", error.message);
    throw error;
  }
}

/**
 * Test API endpoints functionality
 */
async function testAPI() {
  console.log("\n🔌 Testing API Functionality");
  console.log("----------------------------");

  try {
    // Test popular coins API
    console.log("\n📊 Testing Popular Coins API:");
    const popularData = await getPopular();
    console.log(`✅ Retrieved ${popularData.length} popular coins`);
    if (popularData.length > 0) {
      console.log("Sample coin data:");
      console.log(`- Name: ${popularData[0].name_en}`);
      console.log(`- Symbol: ${popularData[0].symbol}`);
      console.log(`- 24h Volume IRR: ${abbreviateNumber(popularData[0].irr?.volume || 0, 1, true)} IRR`);
      console.log(`- Price USD: $${numFormat(popularData[0].usd?.price || 0)}`);
    }

    // Test exchanges API
    console.log("\n🏦 Testing Exchanges API:");
    const exchangesData = await getExchanges();
    console.log(`✅ Retrieved ${exchangesData.length} exchanges`);
    if (exchangesData.length > 0) {
      console.log("Sample exchange data:");
      console.log(`- Name: ${exchangesData[0].name_en}`);
      console.log(`- 24h Volume IRR: ${abbreviateNumber(exchangesData[0].volume || 0, 1, true)} IRR`);
    }

    // Test weekly coin recap API
    console.log("\n📈 Testing Weekly Coin Recap API:");
    const weeklyCoinRecap = await getRecap("coin", "weekly");
    console.log(`✅ Retrieved ${weeklyCoinRecap.length} weekly coin recap items`);
    if (weeklyCoinRecap.length > 0) {
      console.log("Sample weekly recap data:");
      console.log(`- Name: ${weeklyCoinRecap[0].name_en}`);
      console.log(`- Volume: ${abbreviateNumber(weeklyCoinRecap[0].irr?.volume || 0, 1, true)} IRR`);
    }

    // Test monthly exchange recap API
    console.log("\n📈 Testing Monthly Exchange Recap API:");
    const monthlyExchangeRecap = await getRecap("exchange", "monthly");
    console.log(`✅ Retrieved ${monthlyExchangeRecap.length} monthly exchange recap items`);
    if (monthlyExchangeRecap.length > 0) {
      console.log("Sample monthly exchange recap data:");
      console.log(`- Name: ${monthlyExchangeRecap[0].name_en}`);
      console.log(`- Volume: ${abbreviateNumber(monthlyExchangeRecap[0].volume || 0, 1, true)} IRR`);
    }

    console.log("\n✅ API tests completed");

  } catch (error) {
    console.error("❌ API test failed:", error.message);
    throw error;
  }
}

/**
 * Test image generation functionality
 */
async function testImageGeneration() {
  console.log("\n🖼️  Testing Image Generation");
  console.log("---------------------------");

  try {
    // Test daily coin recap image
    console.log("\n📊 Testing Daily Coin Recap Image:");
    const popularData = await getPopular();

    if (popularData.length === 0) {
      throw new Error("No popular data available for image generation");
    }

    // Calculate total volume and prepare data
    const totalVol = popularData
      .filter((item) => item.has_iran)
      .reduce((acc, item) => acc + item.irr.volume, 0);

    const tokens = popularData
      .filter((item) => item.has_iran)
      .map((item) => ({
        name: item.name_en,
        price: "$" + numFormat(item.usd.price),
        volume: abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
        icon: item.icon.startsWith('http') ? item.icon : `https://irancrypto.market/${item.icon}`,
      }))
      .slice(0, 10);

    const yesterday = moment().subtract(1, "day").format("YYYY-MM-DD");

    const imagePath = await createImageFromTemplate(
      "table-coin-light",
      {
        tokens,
        headers: ["Token", "Average Price", "Traded Volume"],
        title: "Daily Recap",
        subtitle: `Total traded volume (24h): ${abbreviateNumber(Math.round(totalVol), 0, true)} IRR`,
        lastUpdate: yesterday,
      },
      "test-daily-coins.jpg"
    );

    console.log(imagePath ? `✅ Generated daily coin recap image: ${imagePath}` : "❌ Failed to generate daily coin recap image");

    // Test weekly coin recap image
    console.log("\n📊 Testing Weekly Coin Recap Image:");
    const weeklyCoinData = await getRecap("coin", "weekly");

    if (weeklyCoinData.length === 0) {
      throw new Error("No weekly coin recap data available");
    }

    const weeklyTotalVol = weeklyCoinData
      .filter((item) => item.has_iran)
      .reduce((acc, item) => acc + item.irr.volume, 0);

    const weeklyTokens = weeklyCoinData
      .filter((item) => item.has_iran)
      .map((item) => ({
        name: item.name_en,
        price: "$" + numFormat(item.usd.price_avg),
        volume: abbreviateNumber(Math.round(item.irr.volume), 1, true) + " IRR",
        icon: item.icon.startsWith('http') ? item.icon : `https://irancrypto.market/${item.icon}`,
      }))
      .slice(0, 10);

    const weeklyImagePath = await createImageFromTemplate(
      "table-coin-dark",
      {
        tokens: weeklyTokens,
        headers: ["Token", "Average Price", "Traded Volume"],
        title: "Weekly Recap",
        subtitle: `Total traded volume in past week: ${abbreviateNumber(Math.round(weeklyTotalVol), 0, true)} IRR`,
        lastUpdate: new Date().toISOString().slice(0, 10),
      },
      "test-weekly-coins.jpg"
    );

    console.log(weeklyImagePath ? `✅ Generated weekly coin recap image: ${weeklyImagePath}` : "❌ Failed to generate weekly coin recap image");

    // Test monthly exchange recap image
    console.log("\n🏦 Testing Monthly Exchange Recap Image:");
    const monthlyExchangeData = await getRecap("exchange", "monthly");

    if (monthlyExchangeData.length === 0) {
      throw new Error("No monthly exchange recap data available");
    }

    const monthlyExchangeTotalVol = monthlyExchangeData.reduce((acc, item) => acc + item.volume, 0);

    const exchanges = monthlyExchangeData
      .map((item) => ({
        name: item.name_en,
        volume: numFormat(Math.round(item.volume), 1, true) + " IRR",
        logo: item.logo,
      }))
      .slice(0, 5);

    const exchangeImagePath = await createImageFromTemplate(
      "table-exchange-dark",
      {
        exchanges,
        title: "Exchanges Monthly Recap",
        subtitle: `Total traded volume in past month: ${abbreviateNumber(Math.round(monthlyExchangeTotalVol), 0, true)} IRR`,
        lastUpdate: new Date().toISOString().slice(0, 10),
      },
      "test-monthly-exchange.jpg"
    );

    console.log(exchangeImagePath ? `✅ Generated monthly exchange recap image: ${exchangeImagePath}` : "❌ Failed to generate monthly exchange recap image");

    console.log("\n✅ Image generation tests completed");
    console.log("\n📁 Generated images saved in writable/ directory");

  } catch (error) {
    console.error("❌ Image generation test failed:", error.message);
    throw error;
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Usage: npm run test:functional <test-type>

Available test types:
  api        Test API endpoints functionality and data retrieval
  caption    Generate sample captions for Instagram/Twitter using AI
  image      Generate recap images without posting (saves to writable/ directory)
  all        Run all tests in logical order (api → caption → image) - default
  help       Show this help message

Examples:
  npm run test:functional api        # Test API connectivity and data
  npm run test:functional caption    # Test AI caption generation
  npm run test:functional image      # Generate test images
  npm run test:functional all        # Run all tests (same as default)
  npm run test:functional             # Run all tests (default behavior)

Test Execution Order:
  1. API tests (data connectivity and retrieval)
  2. Content tests (AI caption generation)
  3. Image tests (template rendering and screenshot generation)

Environment Variables Required:
  - IRANCRYPTO_API_KEY    API key for IranCrypto.market API
  - OPENAI_API_KEY        OpenAI API key for AI caption generation (or other AI provider keys)

Note: These tests generate content and images but do NOT post to social media platforms.
`);
}

// Run the tests
runTests().catch((error) => {
  console.error("💥 Test runner failed:", error.message);
  process.exit(1);
});
