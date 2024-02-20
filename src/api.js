/**
 * Iran Crypto Market API
 * https://irancrypto.market/api
 */
const url = "https://irancrypto.market/api/v1/";

async function request($method, $params = {}) {
  let requestUrl = url + $method;
  // add query parameters
  if (Object.keys($params).length > 0) {
    const queryParams = new URLSearchParams($params);
    requestUrl += "?" + queryParams.toString();
  }
  // send request
  const response = await fetch(requestUrl, {
    headers: {
      Language: "en",
      Authorization: "Bearer " + process.env.IRANCRYPTO_API_KEY,
      "Content-Type": "application/json",
      // User-agent added to bypass Cloudflare's bot protection
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(10000), //Timeout is in ms
  });
  //Wrongful response
  if (!response || response.status !== 200) {
    console.error("Unable to access IranCrypto API", await response.text());
    throw new Error("API Error");
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
 * Recap of the week/month for most traded tokens
 * @param {string} type exchange/coin
 * @param {string} interval weekly/monthly
 * @returns {object[]}
 */
export async function getRecap(type,interval) {
  return await request("recap", { type,interval, limit: 50 });
}