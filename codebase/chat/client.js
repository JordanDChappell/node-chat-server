const { inspect } = require('util');

/* Library */
const {
  generateSessionId,
  addNewActiveSession,
  removeActiveSession,
  displayWelcomeBanner,
} = require('./session');
const {
  sendServerMessageToAllSessions,
  handleUserInput,
} = require('./commands');
const { commonMessages } = require('../utils/messageUtils');

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
      stream.stderr.write('Sorry, no commands are currently implemented in the chat server');
      stream.exit(0);
      stream.end();
    });

    session.on('pty', (accept) => {
      accept();
    });

    session.on('shell', (accept) => {
      const channel = accept();
      addNewActiveSession(identifier, username, session, channel);
      channel.write(displayWelcomeBanner(identifier));
      channel.write(commonMessages.prompt);
      channel.on('data', (data) => handleUserInput(identifier, data));
    });
  });
};

const onClientClose = (identifier, username) => {
  removeActiveSession(identifier);
  console.log(`${identifier} - ${username} closed their connection`);
  sendServerMessageToAllSessions(`User '${username}' has disconnected`);
};

const onClientError = (client, identifier, username, error) => {
  console.log(`User ${identifier} - ${username} encountered an error: ${error.message}`);
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

  client.on('error', (error) => onClientError(client, identifier, username, error));
};

module.exports = {
  onClientConnected,
};
