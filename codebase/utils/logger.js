/* eslint-disable no-console */

const log = (message, ...args) => {
  console.log(message, args);
};

const logInfo = (message, ...args) => {
  console.info(message, ...args);
};

const logWarning = (message, ...args) => {
  console.warn(message, ...args);
};

const logError = (message, ...args) => {
  console.error(message, ...args);
};

module.exports = {
  log,
  logInfo,
  logWarning,
  logError,
};
