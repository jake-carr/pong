# Pong

## Classic Pong game in TypeScript

### Server

-   Supports one game of Pong at a time (starting a multiplayer overwrites a single player game)
-   Generates random username/color per socket per visit
-   Matchmaking uses a FIFO queue
-   Global chat room

### Client

-   Has option to start a single player game if only one person is online
-   Otherwise, join/leave matchmaking, spectate ongoing games, and participate in chat
-   Draws the game state using HTML Canvas api

### Development

1. `npm install -g typescript` Install TypeScript
2. `npm install` Install project dependencies
3. `npm run dev` to compile & serve locally
