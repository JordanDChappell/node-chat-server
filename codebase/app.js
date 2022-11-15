require('dotenv').config();

const crypto = require('crypto');
const { inspect } = require('util');
const { Server } = require('ssh2');

const specialKeys = {
  return: '\r',
  newline: '\r\n',
};

const activeSessions = [];

const generateSessionId = () => crypto.randomUUID();

const addNewActiveSession = (identifier, username, session, channel) => {
  if (activeSessions.filter(s => s.identifier === identifier).length) {
    console.log('Attempted to add an existing session to active session list');
    console.log('identifier: ', identifier);
    console.log('username: ', username);
    console.log('session: ', inspect(session));
    console.log('channel: ', inspect(channel));
    throw Error('Something went wrong, user session already exists');
  }
    
  activeSessions.push({
    identifier,
    username,
    session,
    channel
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

const sendMessageToAllSessions = (fromIdentifier, message) => {
  const sessionsToRecieve = activeSessions.filter(s => s.identifier !== fromIdentifier);

  sessionsToRecieve.forEach(s => {
    s.channel.stdout.write(`${message}${specialKeys.newline}`);
  });

  console.log(message);
}

const onClientAuth = (context) => {
  switch (context.method) {
    case 'password':
      return context.accept();
    case 'publickey':
      return context.accept();
    default:
      return context.reject(['keyboard-interactive', 'password', 'publickey']);
  }
};

const onClientReady = (client, identifier, username) => {
  console.log('Client authenticated');

  client.on('session', (accept, reject) => {
    const session = accept();

    session.on('exec', (accept, reject, info) => {
      console.log(`Client wants to execute: ${inspect(info.command)}`);
      const stream = accept();
      stream.write('Sorry, no commands are currently implemented in the chat server');
      stream.exit(0);
      stream.end();
    });

    session.on('pty', (accept, reject, info) => {
      console.log('Client pty accepted');
      console.log(inspect(info));
      accept();
    });

    session.on('shell', (accept, reject) => {
      console.log('Client shell started');

      const channel = accept();

      addNewActiveSession(identifier, username, session, channel);

      channel.stdout.write(`Hello there ${username}${specialKeys.newline}`);

      let buffer = [];

      channel.on('data', (data) => {
        const string = data.toString();
        console.log(string);

        if (string === specialKeys.return) {
          sendMessageToAllSessions(identifier, buffer.join(''));
          buffer = [];
          return;
        }

        buffer.push(string);
      });
    });
  });
};

const onClientClose = (identifier, username) => {
  removeActiveSession(identifier);
  console.log(`${identifier} - ${username} closed their connection`);
};

const onClientError = (client, identifier, username, error) => {
  removeActiveSession(identifier);
  console.log(`Client ${identifier} - ${username} encountered an error: ${error.message}`);
  client.end();
};

const onClientConnected = (client) => {
  console.log('Client connected');

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

const server = new Server({ hostKeys: [process.env.PRIVATE_KEY] }, onClientConnected);

server.listen(0, '127.0.0.1', () => {
  console.log(`Listening on port ${server.address().port}`);
});