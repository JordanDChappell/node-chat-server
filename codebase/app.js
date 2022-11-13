require('dotenv').config();

const { inspect } = require('util');
const { Server } = require('ssh2');

const server = new Server(
  { hostKeys: [process.env.PRIVATE_KEY] }, 
  (client) => {
    console.log('Client connected!');

    let username = '';

    client.on('authentication', (ctx) => {
      username = ctx.username;

      switch (ctx.method) {
        case 'password':
          return ctx.accept();
        case 'publickey':
          return ctx.accept();
        default:
          return ctx.reject(['keyboard-interactive', 'password', 'publickey']);
      }
    });

    client.on('ready', () => {
      console.log('Client authenticated!');

      client.on('session', (accept, reject) => {
        const session = accept();

        session.on('exec', (accept, reject, info) => {
          console.log(`Client wants to execute: ${inspect(info.command)}`);
          const stream = accept();
          stream.stderr.write('Oh no, the dreaded errors!\r');
          stream.write('Just kidding about the errors!\r');
          stream.exit(0);
          stream.end();
        });

        session.on('pty', (accept, reject, info) => {
          console.log('Client pty accepted');
          accept();
        });

        session.on('shell', (accept, reject) => {
          console.log('Client shell started');

          const channel = accept();

          channel.write(`Hello there ${username}\r`);

          channel.on('data', (data) => {
            console.log(data);
            channel.write(data);
          });
        });
      });
    });

    client.on('close', () => {
      console.log('Client disconnected!');
    });

    client.on('error', (err) => {
      console.log(`Client error! ${err}`);
      client.end();
    })
  }
);

server.listen(0, '127.0.0.1', () => {
  console.log(`Listening on port ${server.address().port}`);
});