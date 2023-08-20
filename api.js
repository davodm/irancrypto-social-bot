/**
 * Iran Crypto Market API
 * https://irancrypto.market/api
 */
const url = "https://irancrypto.market/api/v1/";

async function request($method) {
  const response = await fetch(url + $method, {
    headers: {
      Language: "en",
      Authorization: "Bearer " + process.env.IRANCRYPTO_API_KEY,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout( 10000 ),//Timeout is in ms
  });
  //Wrongful response
  if (!response || response.status!==200) {
    console.error('Unable to access IranCrypto API',await response.text());
    throw new Error("API Error");
  }
  return response.json();
}

/**
 * Popular Cryptos in Iran by 24h volume
 * @returns {object[]}
 */
async function getPopular(){
  return await request('popular');
}

/**
 * Exchanges transactions volume in Iran by 24h volume
 * @returns {object[]}
 */
async function getExchanges(){
  return await request('exchanges');
}

module.exports={
  getExchanges,
  getPopular
}