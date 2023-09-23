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

module.exports = {
  abbreviateNumber,
};
