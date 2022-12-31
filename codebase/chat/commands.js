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
const { addMessage } = require('./messageHistory');

const commands = {
  '/commands': {
    helper: 'Display all available commands',
  },
  '/help': {
    helper: 'Display additional help information about a command',
    advancedHelper: `Usage:${specialKeys.newline}
/help <command>${specialKeys.tab}quick help information for <command>`,
  },
  '/users': {
    helper: 'Display all connected users',
  },
  '/whisper': {
    helper: 'Privately chat with another user in the server',
    advancedHelper: `Usage:${specialKeys.newline}
/whisper <username>${specialKeys.tab}enter private whisper mode with <username>${specialKeys.return}
/whisper <username> <message>${specialKeys.tab}send private <message> to <username> (without entering whisper mode)`,
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
 * Display user input as their existing message with 'me: ' appended rather than terminal prompt indicator.
 * Also handles display of a prompt indicator on a new line.
 * @param {object} sendingSession Client who sent a message.
 */
const handleShellAfterMessageSent = (sendingSession) => {
  const { buffer, channel } = sendingSession;
  clearCurrentLine(channel);
  buffer.unshift('me: ');
  channel.write(buffer.join(''));
  channel.write(commonMessages.newlinePrompt);
  buffer.splice(0, buffer.length);
  sendingSession.position = 0;
};

/**
 * Transition to the next line after sending a server command.
 * @param {object} sendingSession Client who sent the command.
 */
const handleShellAfterCommand = (sendingSession) => {
  const { buffer, channel } = sendingSession;
  channel.write(commonMessages.newlinePrompt);
  buffer.splice(0, buffer.length);
  sendingSession.position = 0;
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
  const { username } = sendingSession;
  sessionsToRecieve.forEach((s) =>
    clearSendRestore(s, `${username}: ${message}`)
  );
  handleShellAfterMessageSent(sendingSession);
  addMessage(senderIdentifier, username, message);
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
    .map((c) => `${c}: ${commands[c]?.helper}`)
    .join(specialKeys.newline);
  sendServerMessageToSession(session, message);
};

/**
 * Display help information for given command to the current user.
 * @param {object} session Client session.
 */
const commandHelp = (session) => {
  const { buffer } = session;
  let commandString = buffer.join('').split(' ')[1];

  if (!commandString) {
    sendServerMessageToSession(session, commands['/help'].advancedHelper);
    return;
  }

  if (!commandString.includes('/')) commandString = `/${commandString}`;

  const command = commands[commandString];

  if (!command)
    sendServerMessageToSession(
      session,
      `${commandString} is not known or currently implemented`
    );
  else
    sendServerMessageToSession(
      session,
      command.advancedHelper ?? command.helper
    );
};

/**
 * Display a list of all other active users to the current user session.
 * @param {object} session Client session.
 */
const listUsers = (session) => {
  const message = listActiveUsers(session.identifier);
  sendServerMessageToSession(session, message);
};

/**
 * Handle special case 'messages' from the user that are preceded with a '/'.
 * @param {object} session Client session.
 * @returns {boolean} True if slash command was handled, else false.
 */
const handleSlashCommand = (session) => {
  const { buffer } = session;
  const commandString = buffer.join('').split(' ')[0];

  if (!commandString.startsWith('/')) return false;

  const command = commands[commandString];

  if (!command || !command.func)
    sendServerMessageToSession(
      session,
      `${commandString} is not known or currently implemented`
    );
  else command.func(session);

  handleShellAfterCommand(session);

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

  // ignore unhandled user input
  if (specialKeys.unhandled.includes(keycode)) return;

  switch (keycode) {
    case specialKeys.enter:
      if (!buffer.length) break;
      if (!handleSlashCommand(session))
        sendClientMessageToAllSessions(identifier, buffer.join(''));
      break;
    case specialKeys.backspace:
      clearCurrentLine(channel);
      buffer.splice(buffer.length - 1, 1);
      channel.write(commonMessages.prompt);
      channel.write(buffer.join(''));
      session.position -= 1;
      break;
    case specialKeys.delete:
      if (session.position === buffer.length) break;
      clearCurrentLine(channel);
      buffer.splice(session.position, 1);
      channel.write(commonMessages.prompt);
      channel.write(buffer.join(''));
      readline.cursorTo(channel, session.position + 2); // add 2 to account for our '> ' prompt!
      break;
    case specialKeys.leftArrow:
      if (session.position === 0) break;
      readline.moveCursor(channel, -1, 0);
      session.position -= 1;
      break;
    case specialKeys.rightArrow:
      if (session.position === buffer.length) break;
      readline.moveCursor(channel, 1, 0);
      session.position += 1;
      break;
    case specialKeys.exit:
      channel.end();
      channel.exit(0);
      break;
    default:
      channel.write(data);
      buffer.splice(session.position, 1, string);
      session.position += 1;
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
  commands['/help'].func = commandHelp;
  commands['/users'].func = listUsers;
};

module.exports = {
  initCommands,
  handleUserInput,
  sendServerMessageToAllSessions,
  sendUserConnectedMessage,
};
