const crypto = require('crypto');
const readline = require('readline');

/* Library */
const { specialKeys, commonMessages } = require('./utils/messageUtils');
const { readAsNumber } = require('./utils/bufferUtils');

const activeSessions = [];

/**
 * Retrive all sessions other than the current user.
 * @param {string} currentIdentifier Client identifier.
 * @returns {Array} List of active sessions.
 */
const activeSessionsOtherThanCurrent = (currentIdentifier) => 
  activeSessions.filter(s => s.identifier !== currentIdentifier);

/**
 * Clear the current prompt for a given user stream.
 * @param {Stream} channel Client stream. 
 */
const clearCurrentLine = (channel) => {
  readline.clearLine(channel);
  readline.cursorTo(channel, 0);
};

/**
 * Send a message from a given client to all active users.
 * @param {string} fromIdentifier 
 * @param {string} message 
 */
const sendClientMessageToAllSessions = (fromIdentifier, message) => {
  const sendingSession = activeSessions.find(s => s.identifier === fromIdentifier);
  const sessionsToRecieve = activeSessions.filter(s => s.identifier !== fromIdentifier);

  sessionsToRecieve.forEach(s => {
    // Need to handle current user input when sending a message, the current line is cleared and then restored
    clearCurrentLine(s.channel);
    s.channel.write(`${sendingSession.username}: ${message}`);
    s.channel.write(commonMessages.newlinePrompt);
    s.channel.write(s.buffer.join(''));
  });
};

/**
 * Generate a new unique session identifier.
 * @returns {string} Session identifier.
 */
const generateSessionId = () => crypto.randomUUID();

/**
 * Add a new user to the list of active chat sessions.
 * @param {string} identifier Client identifier.
 * @param {string} username Client username.
 * @param {object} session Session object.
 * @param {Stream} channel Client stream.
 */
const addNewActiveSession = (identifier, username, session, channel) => {
  console.log(`New user connection: ${identifier} - ${username}`);

  if (activeSessions.filter(s => s.identifier === identifier).length) {
    console.log('Attempted to add an existing session to active session list');
    throw Error('Something went wrong, user session already exists');
  }

  activeSessions.push({
    identifier,
    username,
    session,
    channel,
    buffer: [],
  });
};

/**
 * Remove the given session from the current active list.
 * @param {string} identifier Client identifier.
 */
const removeActiveSession = (identifier) => {
  const index = activeSessions.findIndex(s => s.identifier === identifier);

  if (index < 0) {
    console.log('Tried to remove a session that doesn\'t exist');
    return;
  }

  activeSessions.splice(index, 1);
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

/**
 * Retrieve a nicely formatted date string for the current server time.
 * @returns {string} Formatted date.
 */
const getCurrentServerTimeString = () => {
  const date = new Date();
  return date.toLocaleString('en-AU', {
    dateStyle: 'long',
    timeStyle: 'long',
  });
};

/**
 * Display a welcome banner to newly connected clients.
 * @param {string} currentIdentifier Current session identifier.
 * @returns {string} Welcome banner.
 */
const displayWelcomeBanner = (currentIdentifier) => `=============================================${specialKeys.newline}  Welcome to SSH Chat!${specialKeys.newline}
  Current server time: ${getCurrentServerTimeString()}${specialKeys.newline}  Current active users:${specialKeys.newline}  ${activeSessionsOtherThanCurrent(currentIdentifier).length ? activeSessionsOtherThanCurrent(currentIdentifier).map(s => `  ${s.username}`).join(`${specialKeys.newline}  `) : 'No one else is here 😢'}${specialKeys.newline}
  Please be civil and have a nice time 🥳${specialKeys.newline}=============================================${specialKeys.newline}`;

module.exports = { 
  generateSessionId,
  addNewActiveSession,
  removeActiveSession,
  handleUserInput,
  displayWelcomeBanner,
};
