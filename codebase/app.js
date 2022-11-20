require('dotenv').config();
const { inspect } = require('util');
const { Server } = require('ssh2');

/* Library */
const { commonMessages } = require('./utils/messageUtils');
const {
  generateSessionId,
  addNewActiveSession,
  removeActiveSession,
  handleUserInput,
  displayWelcomeBanner
} = require('./session');

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
  client.on('session', (accept, reject) => {
    const session = accept();

    session.on('exec', (accept, reject, info) => {
      console.log(`Client wants to execute: ${inspect(info.command)}`);
      const stream = accept();
      stream.stderr.write('Sorry, no commands are currently implemented in the chat server');
      stream.exit(0);
      stream.end();
    });

    session.on('pty', (accept, reject, info) => {
      accept();
    });

    session.on('shell', (accept, reject) => {
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
}

const config = {
  hostKeys: [process.env.PRIVATE_KEY],
};

const server = new Server(config, onClientConnected);

server.listen(60606, '127.0.0.1', () => {
  console.log(`Server listening on port ${server.address().port}`);
});