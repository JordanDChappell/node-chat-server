const readAsNumber = (buffer) => parseInt(buffer.toString("hex"), 16);

module.exports = { readAsNumber };
