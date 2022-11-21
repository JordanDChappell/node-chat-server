require('dotenv').config();
const { Server } = require('ssh2');

/* Library */
const { onClientConnected } = require('./chat/client');
const { initCommands } = require('./chat/commands');

initCommands();

const config = {
  hostKeys: [process.env.PRIVATE_KEY],
};

const server = new Server(config, onClientConnected);

server.listen(process.env.PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${server.address().port}`);
});