const crypto = require('crypto');
const { logInfo, logError, logWarning } = require('../utils/logger');

/* Library */
const { specialKeys } = require('../utils/messageUtils');

const activeSessions = [];

/**
 * Retrive all sessions other than the current user.
 * @param {string} currentIdentifier Client identifier.
 * @returns {Array} List of active sessions.
 */
const activeSessionsOtherThanCurrent = (currentIdentifier) =>
  activeSessions.filter((s) => s.identifier !== currentIdentifier);

/**
 * Generate a new unique session identifier.
 * @returns {string} Session identifier.
 */
const generateSessionId = () => crypto.randomUUID();

/**
 * Display a list of all active user connections to the server (other than the current user).
 * @param {string} currentIdentifier Current client identifier.
 * @returns {string} List of all users, else a lonely message.
 */
const listActiveUsers = (currentIdentifier) => {
  const userSessions = activeSessionsOtherThanCurrent(currentIdentifier);
  return userSessions.length
    ? userSessions?.map((s) => `- ${s.username}`).join(specialKeys.newline)
    : 'No one else is here 😢';
};

/**
 * Add a new user to the list of active chat sessions.
 * @param {string} identifier Client identifier.
 * @param {string} username Client username.
 * @param {object} session Session object.
 * @param {Stream} channel Client stream.
 */
const addNewActiveSession = (identifier, username, session, channel) => {
  logInfo(`New user connection: ${identifier} - ${username}`);

  if (activeSessions.filter((s) => s.identifier === identifier).length) {
    logError('Attempted to add an existing session to active session list');
    throw Error('Something went wrong, user session already exists');
  }

  activeSessions.push({
    identifier,
    username,
    session,
    channel,
    buffer: [],
    position: 0,
  });
};

/**
 * Remove the given session from the current active list.
 * @param {string} identifier Client identifier.
 */
const removeActiveSession = (identifier) => {
  const index = activeSessions.findIndex((s) => s.identifier === identifier);

  if (index < 0) {
    logWarning("Tried to remove a session that doesn't exist");
    return;
  }

  activeSessions.splice(index, 1);
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
const displayWelcomeBanner = (currentIdentifier) =>
  `=============================================${
    specialKeys.newline
  }Welcome to SSH Chat!${specialKeys.newline}${
    specialKeys.newline
  }Current server time: ${getCurrentServerTimeString()}${
    specialKeys.newline
  }Current active users:${specialKeys.newline}  ${listActiveUsers(
    currentIdentifier
  )}${specialKeys.newline}${
    specialKeys.newline
  }Type '/commands' to view all available chat commands${specialKeys.newline}${
    specialKeys.newline
  }Please be civil and have a nice time 🥳${
    specialKeys.newline
  }=============================================${specialKeys.newline}`;

module.exports = {
  activeSessions,
  activeSessionsOtherThanCurrent,
  generateSessionId,
  addNewActiveSession,
  removeActiveSession,
  displayWelcomeBanner,
  listActiveUsers,
};
