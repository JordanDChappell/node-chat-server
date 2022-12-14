const colours = {
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
  default: '\u001b[0m',
};

/**
 * Retrieve a colour from the lookup table using index rather than key.
 * @param {number} index
 * @returns {string} ANSI colour escape code.
 */
const getColourBySessionSlot = (index) => {
  const keys = Object.keys(colours);
  return colours[keys[index % 7]] ?? colours.default;
};

module.exports = {
  colours,
  getColourBySessionSlot,
};
