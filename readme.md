# Node Chat Server
## SSH Chat Enabler
A simple SSH server implementation using the [nodejs ssh2 library](https://github.com/mscdex/ssh2) intended to be used as a basic, secure chat application in your favourite terminal!

### How do I connect?
Using your favourite SSH client (PuTTY, Bash, Terminal, Powershell) to connect to {server TBA}

### What commands are available?
The server has a list of 'slash' commands that are detailed if the user requests by sending `/commands` in the chat,
help for each command is availabe using the `/help <command>` 'slash' command.

## Developer Quickstart Guide
Make sure that you have installed NodeJS and it's dependencies and are using yarn as your package manager.

Source files are located in the `/codebase` folder, the following guide assumes that your working directory is set as such.

### Configuration
Configuration of the server is achieved using a `.env` [file](https://hexdocs.pm/dotenvy/dotenv-file-format.html) that needs to be added to the `/codebase` directory.

`.env` files usually contain basic key-value pairs of secret variables, the below table describes each option, if it is required, and if not, it's default value.

#### Options
| Name      | Description | Required | Default |
| ----------- | ----------- | ----------- | ----------- |
| MAX_CONNECTION_COUNT | The maximum allowed number of concurrent client connections | ❎ | `128` |
| MESSAGE_LOG_SIZE | The number of messages that are persisted across user sessions | ❎ | `10` |
| PORT | The port that the application will be bound to | ❎ | `22` |
| PRIVATE_KEY | Private SSH key | ✅ | N/A |


### Install Dependencies
`yarn install`

### Starting The App
`yarn start`

### Linting & Formatting
An ESLint and Prettier configuration has been provided and should be used to check code quality and for correct formatting.

**Note:** You can host your own chat server by cloning the repo and running the above commands on any computer running NodeJS.