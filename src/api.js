/**
 * Iran Crypto Market API
 * https://irancrypto.market/api
 */
import { getENV } from "./env.js";

const BASE_URL = "https://irancrypto.market/api/v1/";
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Make a request to the IranCrypto API
 * @param {string} method - API method endpoint
 * @param {object} params - Query parameters
 * @returns {Promise<object>} API response data
 * @throws {Error} When API request fails
 */
async function request(method, params = {}) {
  const apiKey = getENV("IRANCRYPTO_API_KEY");
  if (!apiKey) {
    throw new Error("IRANCRYPTO_API_KEY environment variable is required");
  }

  let requestUrl = BASE_URL + method;

  // Add query parameters
  if (Object.keys(params).length > 0) {
    const queryParams = new URLSearchParams(params);
    requestUrl += "?" + queryParams.toString();
  }

  // Send request
  const response = await fetch(requestUrl, {
    headers: {
      Language: "en",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // User-agent added to bypass Cloudflare's bot protection
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  // Handle non-200 responses
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`IranCrypto API Error (${response.status}):`, errorText);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Popular Cryptos in Iran by 24h volume
 * @returns {object[]}
 */
export async function getPopular() {
  return await request("popular");
}

/**
 * Exchanges transactions volume in Iran by 24h volume
 * @returns {object[]}
 */
export async function getExchanges() {
  return await request("exchanges");
}

/**
 * Get recap data for most traded tokens or exchanges
 * @param {string} type - Type of recap ('exchange' or 'coin')
 * @param {string} interval - Time interval ('weekly' or 'monthly')
 * @returns {Promise<object[]>} Array of recap data
 * @throws {Error} When parameters are invalid or API fails
 */
export async function getRecap(type, interval) {
  // Validate parameters
  const validTypes = ['exchange', 'coin'];
  const validIntervals = ['weekly', 'monthly'];

  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }

  if (!validIntervals.includes(interval)) {
    throw new Error(`Invalid interval: ${interval}. Must be one of: ${validIntervals.join(', ')}`);
  }

  return await request("recap", { type, interval, limit: 50 });
}