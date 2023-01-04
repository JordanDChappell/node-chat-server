const readline = require('readline');

/* Library */
const {
  activeSessions,
  activeSessionsOtherThanCurrent,
  listActiveUsers,
  sessionModes,
} = require('./session');
const { readAsNumber } = require('../utils/bufferUtils');
const { specialKeys } = require('../utils/messageUtils');
const { logError } = require('../utils/logger');
const { addMessage } = require('./messageHistory');
const {
  getPromptForSession,
  getNewlinePromptForSession,
} = require('../utils/prompt');

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
/whisper${specialKeys.tab}exit whisper mode
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
  session.channel.write(getNewlinePromptForSession(session));
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
  channel.write(getNewlinePromptForSession(sendingSession));
  buffer.splice(0, buffer.length);
  sendingSession.position = 0;
};

/**
 * Display user input as their existing whisper with details appended rather than terminal prompt indicator.
 * Also handles display of a prompt indicator on a new line.
 *  @param {object} sendingSession Client who sent a whisper message.
 * @param {object} targetSession Session of the target user.
 */
const handleShellAfterWhisperSent = (sendingSession, targetSession) => {
  const { buffer, channel } = sendingSession;
  const { colour, username } = targetSession;
  clearCurrentLine(channel);
  buffer.unshift(
    `me [whisper ${colour}@${username}${specialKeys.colourReset}]: `
  );
  const string = buffer.join('').replace(`/whisper ${username} `, '');
  channel.write(string);
  channel.write(getNewlinePromptForSession(sendingSession));
  buffer.splice(0, buffer.length);
  sendingSession.position = 0;
};

/**
 * Transition to the next line after sending a server command.
 * @param {object} sendingSession Client who sent the command.
 */
const handleShellAfterCommand = (sendingSession) => {
  const { buffer, channel } = sendingSession;
  channel.write(getNewlinePromptForSession(sendingSession));
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
  const { username, colour } = sendingSession;
  sessionsToRecieve.forEach((s) =>
    clearSendRestore(
      s,
      `${colour}${username}${specialKeys.colourReset}: ${message}`
    )
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
  handleShellAfterCommand(session);
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
    handleShellAfterCommand(session);
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

  handleShellAfterCommand(session);
};

/**
 * Display a list of all other active users to the current user session.
 * @param {object} session Client session.
 */
const listUsers = (session) => {
  const message = listActiveUsers(session.identifier);
  sendServerMessageToSession(session, message);
  handleShellAfterCommand(session);
};

/**
 * Enable whisper mode from the sender to the target.
 * @param {object} senderSession Sender client session.
 * @param {object} targetSession Target client session.
 */
const handleWhisperMode = (senderSession, targetSession) => {
  senderSession.mode = sessionModes.whisper;
  senderSession.target = targetSession.identifier;
  handleShellAfterCommand(senderSession);
};

/**
 * Send a single whisper message to given target session.
 * @param {object} senderSession Sender client session.
 * @param {object} targetSession Target client session.
 */
const handleWhisperToUser = (senderSession, targetSession) => {
  const {
    buffer,
    username: senderUsername,
    colour: senderColour,
  } = senderSession;
  const { username: targetUsername } = targetSession;
  const string = buffer.join('');
  const message = string.replace(`/whisper ${targetUsername} `, '');
  clearSendRestore(
    targetSession,
    `${senderColour}${senderUsername}${specialKeys.colourReset} [whisper]: ${message}`
  );
  handleShellAfterWhisperSent(senderSession, targetSession);
};

/**
 * Implements the 'whisper' command, depending on arguments will send a whisper to user or enter whisper mode with
 * the given user.
 * @param {object} session Client session.
 */
const whisper = (session) => {
  const { buffer } = session;
  const parts = buffer.join('').split(' ');

  // determine whisper format
  if (parts.length < 2) {
    // disable whisper mode
    session.mode = sessionModes.default;
    session.target = '';
    handleShellAfterCommand(session);
    return;
  }

  const targetUsername = parts[1];
  const targetSession = activeSessions.find(
    (s) => s.username === targetUsername
  );

  if (!targetSession) {
    sendServerMessageToSession(
      session,
      `Unable to find given user '${targetUsername}'`
    );
    handleShellAfterCommand(session);
    return;
  }

  if (parts.length === 2) {
    handleWhisperMode(session, targetSession);
    return;
  }

  handleWhisperToUser(session, targetSession);
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

  return true;
};

/**
 * Handle user input from the terminal intended as a chat message.
 * @param {string} senderIdentifier Unique identifier of sender.
 * @param {string} message Message to send.
 */
const handleClientMessage = (senderIdentifier, message) => {
  const sendingSession = activeSessions.find(
    (s) => s.identifier === senderIdentifier
  );

  if (sendingSession.mode === sessionModes.whisper) {
    const targetSession = activeSessions.find(
      (s) => s.identifier === sendingSession.target
    );
    handleWhisperToUser(sendingSession, targetSession);
    return;
  }

  sendClientMessageToAllSessions(senderIdentifier, message);
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
        handleClientMessage(identifier, buffer.join(''));
      break;
    case specialKeys.backspace:
      if (session.position === 0) break;
      clearCurrentLine(channel);
      buffer.splice(buffer.length - 1, 1);
      channel.write(getPromptForSession(session));
      channel.write(buffer.join(''));
      session.position -= 1;
      break;
    case specialKeys.delete:
      if (session.position === buffer.length) break;
      clearCurrentLine(channel);
      buffer.splice(session.position, 1);
      channel.write(getPromptForSession(session));
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
 */
const sendUserConnectedMessage = (identifier) => {
  const { colour, username } = activeSessions.find(
    (s) => s.identifier === identifier
  );
  const userSessions = activeSessionsOtherThanCurrent(identifier);
  userSessions.forEach((s) =>
    clearSendRestore(
      s,
      `User '${colour}${username}${specialKeys.colourReset}' has connected`
    )
  );
};

/**
 * Initialise command mapping functions at runtime.
 */
const initCommands = () => {
  commands['/commands'].func = listCommands;
  commands['/help'].func = commandHelp;
  commands['/users'].func = listUsers;
  commands['/whisper'].func = whisper;
};

module.exports = {
  initCommands,
  handleUserInput,
  sendServerMessageToAllSessions,
  sendUserConnectedMessage,
};
