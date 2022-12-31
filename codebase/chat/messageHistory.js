/* Library */
const { activeSessions } = require('./session');
const { specialKeys } = require('../utils/messageUtils');

const MESSAGE_LOG_SIZE = process.env.MESSAGE_LOG_SIZE ?? 10;
const messageHistory = [];

/**
 * Add a new user message to the history / log.
 * @param {string} senderIdentifier Unique message sender identifier.
 * @param {string} senderName Sender username.
 * @param {string} message Message sent.
 */
const addMessage = (senderIdentifier, senderName, message) => {
  if (messageHistory.length >= MESSAGE_LOG_SIZE) messageHistory.shift();

  messageHistory.push({
    senderIdentifier,
    senderName,
    message,
  });
};

/**
 * Return a string representation of the message history, with newlines applied as required.
 * @returns {string} Message history string.
 */
const getFormattedMessageHistory = () => {
  const sessions = activeSessions.filter((s) =>
    messageHistory.some((m) => m.senderIdentifier === s.identifier)
  );
  const messages = messageHistory.map((m) => {
    const session = sessions.find((s) => m.senderIdentifier === s.identifier);
    return `${session?.username ?? `${m.senderName} (offline)`}: ${m.message}`;
  });

  if (!messages.length) return '';

  return `${messages.join(specialKeys.newline)}${specialKeys.newline}`;
};

module.exports = {
  messageHistory,
  addMessage,
  getFormattedMessageHistory,
};
