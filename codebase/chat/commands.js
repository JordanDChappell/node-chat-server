const readline = require('readline');

/* Library */
const {
  activeSessions,
  activeSessionsOtherThanCurrent,
  listActiveUsers,
} = require('./session');
const { readAsNumber } = require('../utils/bufferUtils');
const { commonMessages, specialKeys } = require('../utils/messageUtils');
const { logError } = require('../utils/logger');

const commands = {
  '/commands': {
    helper: 'Display a list of available commands',
  },
  '/users': {
    helper: 'Display a list of all connected users',
  },
};

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
  const sendingSession = activeSessions.find(
    (s) => s.identifier === senderIdentifier
  );
  const sessionsToRecieve = activeSessions.filter(
    (s) => s.identifier !== senderIdentifier
  );
  sessionsToRecieve.forEach((s) =>
    clearSendRestore(s, `${sendingSession.username}: ${message}`)
  );
};

/**
 * Send a message to all clients from the server.
 * @param {string} message Message to send.
 */
const sendServerMessageToAllSessions = (message) => {
  activeSessions.forEach((s) => clearSendRestore(s, message));
};

/**
 * Send a special server message to a single user session.
 * @param {object} session Client session.
 * @param {string} message Message to send.
 */
const sendServerMessageToSession = (session, message) => {
  session.channel.write(specialKeys.newline);
  session.channel.write(specialKeys.newline);
  session.channel.write(message);
  session.channel.write(specialKeys.newline);
};

/**
 * Display a list of all available server commands to the current user session.
 * @param {object} session Client session.
 */
const listCommands = (session) => {
  const commandNames = Object.keys(commands);
  const message = commandNames
    .map((c) => `    ${c}: ${commands[c]?.helper}`)
    .join(specialKeys.newline);
  sendServerMessageToSession(session, message);
};

/**
 * Display a list of all other active users to the current user session.
 * @param {object} session Client session.
 */
const listUsers = (session) => {
  const message = listActiveUsers(session.identifier);
  sendServerMessageToSession(session, message);
};

const handleSlashCommand = (session) => {
  const { buffer } = session;
  const string = buffer.join('');

  if (!string.startsWith('/')) return false;

  const command = commands[string];

  if (!command || !command.func)
    sendServerMessageToSession(
      session,
      `  '${string}' is not known or currently implemented`
    );
  else command.func(session);

  return true;
};

/**
 * Receive and handle user input data.
 * @param {string} identifier Client identifier.
 * @param {Buffer} data Client input buffer.
 */
const handleUserInput = (identifier, data) => {
  const session = activeSessions.find((s) => s.identifier === identifier);

  if (!session) {
    logError("Tried to accept input for session that doesn't exist");
    return;
  }

  const { channel, buffer } = session;

  const string = data.toString();
  const keycode = readAsNumber(data);

  switch (keycode) {
    case specialKeys.return:
      if (!handleSlashCommand(session))
        sendClientMessageToAllSessions(identifier, buffer.join(''));
      channel.write(commonMessages.newlinePrompt);
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

/**
 * Send a message to other clients when a new user connects.
 * @param {string} identifier Unique client identifier.
 * @param {string} username
 */
const sendUserConnectedMessage = (identifier, username) => {
  const userSessions = activeSessionsOtherThanCurrent(identifier);
  userSessions.forEach((s) =>
    clearSendRestore(s, `User '${username}' has connected`)
  );
};

/**
 * Initialise command mapping functions at runtime.
 */
const initCommands = () => {
  commands['/commands'].func = listCommands;
  commands['/users'].func = listUsers;
};

module.exports = {
  initCommands,
  handleUserInput,
  sendServerMessageToAllSessions,
  sendUserConnectedMessage,
};
