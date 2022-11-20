const crypto = require('crypto');
const readline = require('readline');

/* Library */
const { specialKeys, commonMessages } = require('./utils/messageUtils');
const { readAsNumber } = require('./utils/bufferUtils');

const activeSessions = [];

const generateSessionId = () => crypto.randomUUID();

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

const removeActiveSession = (identifier) => {
  const index = activeSessions.findIndex(s => s.identifier === identifier);

  if (index < 0) {
    console.log('Tried to remove a session that doesn\'t exist');
    return;
  }

  activeSessions.splice(index, 1);
};

const clear = (stream) => {
  readline.clearLine(stream);
  readline.cursorTo(stream, 0);
}

const sendMessageToAllSessions = (fromIdentifier, message) => {
  const sendingSession = activeSessions.find(s => s.identifier === fromIdentifier);
  const sessionsToRecieve = activeSessions.filter(s => s.identifier !== fromIdentifier);

  sessionsToRecieve.forEach(s => {
    clear(s.channel);
    s.channel.write(`${sendingSession.username}: ${message}${specialKeys.newline}`);
    s.channel.write(commonMessages.prompt);
    s.channel.write(s.buffer.join(''));
  });
}

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
      channel.write(`${specialKeys.newline}${commonMessages.prompt}`);
      sendMessageToAllSessions(identifier, buffer.join(''));
      buffer.splice(0, buffer.length);
      break;
    case specialKeys.backspace:
      clear(channel);
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

module.exports = { generateSessionId, addNewActiveSession, removeActiveSession, handleUserInput };
