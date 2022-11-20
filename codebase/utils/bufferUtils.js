/**
 * Read a buffer as it's integer value.
 * @param {Buffer} buffer 
 * @returns {number} Integer value of buffer.
 */
const readAsNumber = (buffer) => parseInt(buffer.toString("hex"), 16);

module.exports = { readAsNumber };
