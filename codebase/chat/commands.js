const readline = require('readline');

/* Library */
const { activeSessions } = require('./session');
const { readAsNumber } = require('../utils/bufferUtils');
const { commonMessages, specialKeys } = require('../utils/messageUtils');

/**
 * Clear the current prompt for a given user stream.
 * @param {Stream} channel Client stream. 
 */
 const clearCurrentLine = (channel) => {
  readline.clearLine(channel);
  readline.cursorTo(channel, 0);
};

/**
 * Handle current user input while sending a message, clear their line, send message, restore their previous input.
 * @param {object} session Client session.
 * @param {string} message Message to send.
 */
const clearSendRestore = (session, message) => {
  clearCurrentLine(session.channel);
  session.channel.write(message);
  session.channel.write(commonMessages.newlinePrompt);
  session.channel.write(session.buffer.join(''));
};

/**
 * Send a message from a given client to all active users.
 * @param {string} senderIdentifier Unique identifier of sender.
 * @param {string} message Message to send.
 */
const sendClientMessageToAllSessions = (senderIdentifier, message) => {
  const sendingSession = activeSessions.find(s => s.identifier === senderIdentifier);
  const sessionsToRecieve = activeSessions.filter(s => s.identifier !== senderIdentifier);
  sessionsToRecieve.forEach(s => clearSendRestore(s, `${sendingSession.username}: ${message}`));
};

/**
 * Send a message to all clients from the server.
 * @param {string} message Message to send.
 */
 const sendServerMessageToAllSessions = (message) => {
  activeSessions.forEach(s => clearSendRestore(s, message));
};

/**
 * Receive and handle user input data.
 * @param {string} identifier Client identifier.
 * @param {Buffer} data Client input buffer.
 */
 const handleUserInput = (identifier, data) => {
  const session = activeSessions.find(s => s.identifier === identifier);

  if (!session) {
    console.log('Tried to accept input for session that doesn\'t exist');
    return;
  }

  const { channel, buffer } = session;

  const string = data.toString();
  const keycode = readAsNumber(data);

  switch (keycode) {
    case specialKeys.return:
      channel.write(commonMessages.newlinePrompt)
      sendClientMessageToAllSessions(identifier, buffer.join(''));
      buffer.splice(0, buffer.length);
      break;
    case specialKeys.backspace:
      clearCurrentLine(channel);
      buffer.splice(buffer.length - 1, 1);
      channel.write(commonMessages.prompt);
      channel.write(buffer.join(''));
      break;
    case specialKeys.exit:
      channel.end();
      channel.exit(0);
      break;
    default:
      channel.write(data);
      buffer.push(string);
      break;
  }
};

module.exports = {
  handleUserInput,
  sendServerMessageToAllSessions,
};
