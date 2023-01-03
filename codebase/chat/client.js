/* Library */
const {
  generateSessionId,
  addNewActiveSession,
  removeActiveSession,
  displayWelcomeBanner,
  activeSessions,
} = require('./session');
const {
  sendServerMessageToAllSessions,
  handleUserInput,
  sendUserConnectedMessage,
} = require('./commands');
const { commonMessages, specialKeys } = require('../utils/messageUtils');
const { logInfo, logError } = require('../utils/logger');
const { getFormattedMessageHistory } = require('./messageHistory');

const MAX_CONNECTION_COUNT = process.env.MAX_CONNECTION_COUNT ?? 128;

const onClientAuth = (context) => {
  switch (context.method) {
    case 'keyboard-interactive':
    case 'password':
      return context.accept();
    default:
      return context.reject(['keyboard-interactive', 'password']);
  }
};

const onClientReady = (client, identifier, username) => {
  client.on('session', (accept) => {
    const session = accept();

    session.on('exec', (accept) => {
      const stream = accept();
      stream.stderr.write(
        'Sorry, no commands are currently implemented in the chat server'
      );
      stream.exit(0);
      stream.end();
    });

    session.on('pty', (accept) => {
      accept();
    });

    session.on('shell', (accept) => {
      const channel = accept();

      if (activeSessions.length >= MAX_CONNECTION_COUNT) {
        channel.write(
          `Sorry, the server is currently at capacity, please try again later or contact an administrator${specialKeys.newline}`
        );
        throw new Error('Server at capacity');
      }

      addNewActiveSession(identifier, username, session, channel);
      sendUserConnectedMessage(identifier, username);
      channel.write(displayWelcomeBanner(identifier));
      channel.write(getFormattedMessageHistory());
      channel.write(`${commonMessages.prompt} `);
      channel.on('data', (data) => handleUserInput(identifier, data));
    });
  });
};

const onClientClose = (identifier, username) => {
  removeActiveSession(identifier);
  logInfo(`${identifier} - ${username} closed their connection`);
  sendServerMessageToAllSessions(`User '${username}' has disconnected`);
};

const onClientError = (client, identifier, username, error) => {
  logError(
    `User ${identifier} - ${username} encountered an error: ${error.message}`
  );
  client.end();
};

const onClientConnected = (client) => {
  let identifier = generateSessionId();
  let username = '';

  client.on('authentication', (context) => {
    onClientAuth(context);
    username = context.username;
  });

  client.on('ready', () => onClientReady(client, identifier, username));

  client.on('close', () => onClientClose(identifier, username));

  client.on('error', (error) =>
    onClientError(client, identifier, username, error)
  );
};

module.exports = {
  onClientConnected,
};
