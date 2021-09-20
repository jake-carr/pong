import express from 'express';
import path from 'path';
import http from 'http';
import socketIO from 'socket.io';
import Pong from './pong';
import Player from './player';
import RandomScreenNameGenerator from './randomScreenNameGenerator';
import RandomColorPicker from './randomColorPicker';

const port: number = Number(process.env.PORT) || 3000;

class App {
    private port: number;
    private server: http.Server;

    private io: socketIO.Server;
    private players: { [id: string]: Player } = {};
    private randomScreenNameGenerator: RandomScreenNameGenerator;
    private randomColorPicker: RandomColorPicker;

    private game: Pong;
    private matchmakingQueue: string[]; // socketids

    constructor(port: number) {
        const updateChat = this.updateChat.bind(this);
        const updateGame = this.updateGame.bind(this);
        const updatePlayers = this.updatePlayers.bind(this);

        this.players = {};
        this.port = port;
        this.matchmakingQueue = [];

        const app = express();
        app.use(express.static(path.join(__dirname, '../client')));
        app.use(
            '/bootstrap',
            express.static(
                path.join(__dirname, '../../node_modules/bootstrap/dist'),
            ),
        );

        this.server = new http.Server(app);
        this.io = new socketIO.Server(this.server);
        let queue = this.matchmakingQueue;

        this.randomScreenNameGenerator = new RandomScreenNameGenerator();
        this.randomColorPicker = new RandomColorPicker();

        this.game = new Pong(updateChat, updateGame, updatePlayers);

        this.io.on('connection', (socket: socketIO.Socket) => {
            console.log('a user connected : ' + socket.id);

            // Generate a random screen name and color for each user each session.
            let screenName =
                this.randomScreenNameGenerator.generateRandomScreenName();

            let hexCode = this.randomColorPicker.pickColor();

            let isSpectator;
            let isGameInProg = this.game.isGameInProgress();
            if (!isGameInProg) {
                isSpectator = false;
            } else if (
                // Players start spectating any ongoing single-player game, but any living player can override it with the multiplayer button.
                this.game.getGameState() &&
                this.game.getGameState().player2.info._screenName ==
                    'The Computer'
            ) {
                const spectatingSinglePlayer: ChatMessage = {
                    from: 'PONG SERVER',
                    message: `[Private message] Hi there. A single player game is already in progress, but if you both join the matchmaking queue a multiplayer game will start instead.`,
                    source: 'game',
                };
                socket.emit('chatMessage', spectatingSinglePlayer);
                isSpectator = true;
            } else if (this.game.getGameState()) {
                // True spectator players won't have access to buttons until the current game stops
                const spectatingMultiPlayerWarning: ChatMessage = {
                    from: 'PONG SERVER',
                    message: `[Private message] Hi there. A multiplayer game is already in progress, and this server only supports two people playing at once :^(. Feel free to spectate and join the matchmaking queue.`,
                    source: 'game',
                };
                socket.emit('chatMessage', spectatingMultiPlayerWarning);
                isSpectator = true;
            }

            this.players[socket.id] = new Player(
                screenName,
                hexCode,
                socket.id,
                isSpectator,
            );

            // Return player info to their client and broadcast a server message
            socket.emit(
                'playerDetails',
                this.players[socket.id].player,
                isSpectator,
            );
            const joinMessage: ChatMessage = {
                from: 'PONG SERVER',
                message: `${screenName} has arrived!`,
                source: 'game',
            };
            this.updateChat(joinMessage);

            // Update server player id list
            const playerids = Object.keys(this.players);
            updatePlayers(playerids);

            socket.on('joinMatchmaking', () => {
                if (!queue.includes(socket.id)) {
                    if (socket.id === '010101') {
                        return;
                    }
                    queue.push(socket.id);
                    const joinMessage: ChatMessage = {
                        from: 'PONG SERVER',
                        message: `${
                            this.players[socket.id]._screenName
                        } joined the matchmaking queue!`,
                        source: 'game',
                    };
                    this.updateChat(joinMessage);
                    this.matchmaker();
                }
            });

            socket.on('leaveMatchmaking', () => {
                queue.splice(queue.indexOf(socket.id), 1);
                const leaveMessage: ChatMessage = {
                    from: 'PONG SERVER',
                    message: `${
                        this.players[socket.id]._screenName
                    } left the queue.`,
                    source: 'game',
                };
                this.updateChat(leaveMessage);
            });

            socket.on('startSinglePlayer', () => {
                const startMessage: ChatMessage = {
                    from: 'PONG SERVER',
                    message: `Starting a Single Player Game :^)`,
                    source: 'game',
                };
                this.updateChat(startMessage);
                const player = this.players[socket.id];

                const kickoff = () => {
                    const playerStillExists = player == this.players[socket.id];

                    if (!playerStillExists) {
                        const errorMessage: ChatMessage = {
                            from: 'PONG SERVER',
                            message: `Nevermind; the player who started left during countdown.`,
                            source: 'game',
                        };
                        this.updateChat(errorMessage);
                    } else {
                        this.game.stop();
                        this.game.startSinglePlayerGame(player);
                        const initialGameState = this.game.getGameState();
                        this.io.emit(
                            'singlePlayerGameStart',
                            initialGameState,
                            socket.id,
                        );
                    }
                };
                this.game.countdown(kickoff);
            });

            socket.on('stopGame', () => {
                const stopMessage: ChatMessage = {
                    from: 'PONG SERVER',
                    message: 'Stopping single player game.',
                    source: 'game',
                };
                socket.emit('chatMessage', stopMessage);
                this.game.stop();
            });

            // Handle player direction changes
            socket.on(
                'directionChange',
                (direction: 'up' | 'down', gameState: GameState) => {
                    const update = { ...gameState };
                    const isPlayer1 =
                        socket.id == gameState.player1.info._socketId;
                    const isPlayer2 =
                        socket.id == gameState.player2.info._socketId;

                    if (!isPlayer1 && !isPlayer2) {
                        return;
                    } else if (isPlayer1) {
                        update.player1.direction = direction;
                    } else if (isPlayer2) {
                        update.player2.direction = direction;
                    }

                    this.game.updateGameState(update);
                },
            );

            socket.on('disconnect', () => {
                console.log('a user disconnected : ' + socket.id);
                if (this.players && this.players[socket.id]) {
                    const name = this.players[socket.id]._screenName;

                    const exitMessage: ChatMessage = {
                        from: 'PONG SERVER',
                        message: `${name} is no longer with us.`,
                        source: 'game',
                    };
                    this.updateChat(exitMessage);

                    if (this.game.getGameState()) {
                        // If you were in the game, inform the rest of the clients and return your opponent to the queue.
                        const wasGameParticipant =
                            this.game.getGameState().player1.info._socketId ==
                                socket.id ||
                            this.game.getGameState().player2.info._socketId ==
                                socket.id;

                        if (wasGameParticipant) {
                            this.game.stop();
                            const disconnectMessage: ChatMessage = {
                                from: 'PONG SERVER',
                                message: `A player disconnected! A new game will start when two players are in queue.`,
                                source: 'game',
                            };
                            socket.broadcast.emit(
                                'chatMessage',
                                disconnectMessage,
                            );
                            socket.broadcast.emit('gameStopped');
                            this.remake(socket.id);
                        }
                    }

                    // Delete your socket from the global list and inform the other clients.
                    delete this.players[socket.id];
                    updatePlayers(Object.keys(this.players));

                    // If there's no players left online, stop any in progress game.
                    if (!this.players) {
                        this.game.stop();
                    }
                }
            });

            socket.on('chatMessage', (chatMessage: ChatMessage) => {
                this.updateChat(chatMessage);
            });
        });
    }

    public updateGame = (gameState: GameState) => {
        this.io.emit('gameUpdate', gameState);
    };

    public updateChat = (chatMessage: ChatMessage) => {
        this.io.emit('chatMessage', chatMessage);
    };

    public updatePlayers = (playerIds: string[]) => {
        const playerData = [];
        for (let socketId of playerIds) {
            playerData.push(this.players[socketId]);
        }
        this.io.emit('playersUpdate', playerData);
    };

    public remake = (socketId: string) => {
        // When a player leaves an ongoing game, remake attempts to restart with the other player who was in it

        const gs = this.game.getGameState();
        let queue = this.matchmakingQueue;
        let remainingPlayer = gs.player1.info._socketId;
        if (remainingPlayer == socketId) {
            remainingPlayer = gs.player2.info._socketId;
        }

        // Ensure the leaver is not in queue and that the other player is at the front.
        if (queue.includes(socketId)) queue.splice(queue.indexOf(socketId), 1);
        if (!queue.includes(remainingPlayer)) queue.unshift(remainingPlayer);

        if (this.players[remainingPlayer]) {
            // Send a system message.
            const remakeNotice: ChatMessage = {
                from: 'PONG SERVER',
                message: `${this.players[remainingPlayer]._screenName} has been returned to the queue.`,
                source: 'game',
            };
            this.updateChat(remakeNotice);
        }

        // Attempt to start a new game.
        this.matchmaker();
    };

    public matchmaker = () => {
        let queue = this.matchmakingQueue;
        if (queue.length < 2) return;

        const gs = this.game.getGameState();
        const gameInProg = this.game.isGameInProgress();
        const existingSinglePlayerGame =
            gs && gs.player2.info._screenName == 'The Computer';

        if (
            // Multiplayer games will overwrite an existing singleplayer game
            existingSinglePlayerGame ||
            // Otherwise only start if there's no game in progress
            !gameInProg
        ) {
            // First two players in the queue play; rest spectate.
            let player1, player2;
            if (existingSinglePlayerGame) {
                player1 = gs.player1.info;
                // Handle various queue cases since the server cycles between single and multiplayer games.
                if (player1._socketId == queue[0] && this.players[queue[1]]) {
                    player2 = this.players[queue[1]];
                    player2._socketId = queue[1];
                    queue.splice(0, 2);
                } else if (
                    player1._socketId == queue[1] &&
                    this.players[queue[0]]
                ) {
                    player2 = this.players[queue[0]];
                    player2._socketId = queue[0];
                    queue.splice(0, 2);
                } else if (this.players[queue[0]]) {
                    player2 = this.players[queue[0]];
                    player2._socketId = queue[0];
                    queue.splice(0, 1);
                }
            } else if (this.players[queue[0]] && this.players[queue[1]]) {
                player1 = this.players[queue[0]];
                player1._socketId = queue[0];

                player2 = this.players[queue[1]];
                player2._socketId = queue[1];

                queue.splice(0, 2);
            }

            if (player1 && player2) {
                const startMessage: ChatMessage = {
                    from: 'PONG SERVER',
                    message: `Starting a Multiplayer game betwen ${player1._screenName} & ${player2._screenName}!`,
                    source: 'game',
                };

                player1._spectator = false;
                player2._spectator = false;
                this.updateChat(startMessage);

                // Mark additional players in queue as spectators
                for (let i = 2; i < queue.length; i++) {
                    console.log(
                        this.players[queue[i]]._screenName,
                        'is now a spectator',
                    );
                    this.players[queue[i]]._spectator = true;
                }
                const playerIds = Object.keys(this.players);
                this.updatePlayers(playerIds);

                const kickoff = () => {
                    if (!this.players) return;

                    this.game.stop();
                    this.game.startMultiPlayerGame(player1, player2);
                    const initialGameState = this.game.getGameState();
                    const participantIds = [
                        player1._socketId,
                        player2._socketId,
                    ];
                    this.io.emit(
                        'multiPlayerGameStart',
                        initialGameState,
                        participantIds,
                    );
                };
                this.game.countdown(kickoff);
            }
        }
    };

    public Start() {
        this.server.listen(this.port, () => {
            console.log(`Server listening on port ${this.port}.`);
        });
    }
}

new App(port).Start();
