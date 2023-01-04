require('dotenv').config();
const { Server } = require('ssh2');

/* Library */
const { onClientConnected } = require('./chat/client');
const { initCommands } = require('./chat/commands');
const { logInfo } = require('./utils/logger');

initCommands();

const config = {
  hostKeys: [process.env.PRIVATE_KEY],
};

const port = process.env.PORT ?? 22;
const server = new Server(config, onClientConnected);

server.listen(port, '0.0.0.0', () => {
  logInfo(`Server listening on port ${server.address().port}`);
});
