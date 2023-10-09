const SI_PREFIXES = [
  { value: 1, symbol: "", long: "" },
  { value: 1e3, symbol: "K", long: " Thousand" },
  { value: 1e6, symbol: "M", long: " Million" },
  { value: 1e9, symbol: "B", long: " Billion" },
  { value: 1e12, symbol: "t", long: " Trillion" },
  { value: 1e15, symbol: "q", long: " Quadrillion" },
  { value: 1e18, symbol: "Q", long: " Quintillion" },
];

/**
 * Abbreviate a number with a short or long suffix
 * @param {number} value
 * @param {boolean} short
 * @returns {string}
 */

const abbreviateNumber = (number, decimal = 1, long = false) => {
  if (number === 0) return number;

  const tier = SI_PREFIXES.filter((n) => number >= n.value).pop();
  const numberFixed = (number / tier.value).toFixed(decimal);

  return `${numberFixed}${tier[long ? "long" : "symbol"]}`;
};

/**
 * Format numbers with decimal places
 * @param {number} amount 
 * @returns {string}
 */
function numFormat(amount) {
  let decimal = 0;
  if (amount < 10) {
    decimal = 1;
  }
  if (amount < 1) {
    decimal = 2;
  }
  if (amount < 0.1) {
    decimal = 3;
  }
  if (amount < 0.01) {
    decimal = 4;
  }
  if (amount < 0.001) {
    decimal = 5;
  }
  if (amount < 0.0001) {
    decimal = 6;
  }
  return amount.toLocaleString("en-US", { minimumFractionDigits: decimal });
}

module.exports = {
  abbreviateNumber,
  numFormat
};
