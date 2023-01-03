const { sessionModes, activeSessions } = require('../chat/session');
const { commonMessages, specialKeys } = require('./messageUtils');

/**
 * Determine the current prompt indicator for the current session.
 * @param {object} session Client session.
 * @returns {string} Prompt.
 */
const getPromptForSession = (session) => {
  const targetSession = activeSessions.find(
    (s) => s.identifier === session.target
  );
  return session.mode === sessionModes.whisper
    ? `${targetSession?.colour}${commonMessages.whisperPrompt}${targetSession?.username}${specialKeys.colourReset} `
    : `${commonMessages.prompt} `;
};

/**
 * Determine the current newline prompt indicator for the current session.
 * @param {object} session Client session.
 * @returns {string} Newline prompt.
 */
const getNewlinePromptForSession = (session) => {
  const targetSession = activeSessions.find(
    (s) => s.identifier === session.target
  );
  return session.mode === sessionModes.whisper
    ? `${targetSession.colour}${commonMessages.newlineWhisperPrompt}${targetSession?.username}${specialKeys.colourReset} `
    : `${commonMessages.newlinePrompt} `;
};

module.exports = {
  getPromptForSession,
  getNewlinePromptForSession,
};
