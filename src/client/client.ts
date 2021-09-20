class Game {
    static boardDimensions = {
        width: 700,
        height: 500,
    };

    private context: CanvasRenderingContext2D;

    constructor() {
        const canvas = <HTMLCanvasElement>document.getElementById('CANVAS');

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        this.context = ctx;
    }

    public drawEdges() {
        const { width, height } = Game.boardDimensions;

        this.context.lineWidth = 1;

        // Edges
        this.context.setLineDash([]); // solid
        this.context.fillStyle = 'rgb(50, 50, 50)'; // Background color, light gray
        this.context.strokeStyle = 'rgb(254, 254, 254)'; // Border color, white
        this.context.fillRect(0, 0, width, height); // Conver canvas with filled rectangle
        this.context.strokeRect(0, 0, width, height); // Draw a border around the entire canvas

        // Dashed line in center
        this.context.setLineDash([5, 3]); // dashes are 5px and spaces are 3px
        this.context.beginPath();
        this.context.moveTo(width / 2, 0);
        this.context.lineTo(width / 2, height);
        this.context.stroke();
    }

    public drawPlayer(color: string, position: Position, isP1: boolean) {
        const { x, y } = position;

        this.context.fillStyle = 'white';
        // Draws a white base paddle, plus the player's color showing the valid collision portion of it.
        if (isP1) {
            this.context.fillRect(x, y, 7, 75);
            this.context.fillStyle = color;
            this.context.fillRect(x + 7, y, 3, 75);
        } else {
            this.context.fillRect(x + 3, y, 7, 75);
            this.context.fillStyle = color;
            this.context.fillRect(x, y, 3, 75);
        }
    }

    public drawBall(position: Position) {
        const { x, y } = position;

        this.context.beginPath();
        this.context.arc(x, y, 5, 0, 2 * Math.PI);

        this.context.fillStyle = 'white';
        this.context.fill();
    }

    public drawGameState(gameState: GameState) {
        if (!gameState) {
            this.drawEdges();
        } else {
            const { player1, player2, ball } = gameState;

            this.drawEdges();
            this.drawPlayer(player1.info._color, player1.position, true);
            this.drawPlayer(player2.info._color, player2.position, false);
            this.drawBall(ball.position);
        }
    }
}

class Client {
    private socket: SocketIOClient.Socket;

    private screenName: string;
    private spectator: boolean;
    private color: string;

    private game: Game;
    private gameState: GameState;

    constructor() {
        const sendMsg = this.sendMessage.bind(this);

        const HTML = {
            playersOnline: <HTMLElement>(
                document.getElementById('players-online')
            ),
            clientStatus: <HTMLElement>document.getElementById('client-status'),
            welcomeMessage: <HTMLElement>(
                document.getElementById('welcome-message')
            ),
            gameButtons: <HTMLElement>document.getElementById('game-buttons'),
            scoreboard: <HTMLElement>document.getElementById('scoreboard'),
            chatMessages: <HTMLElement>document.getElementById('chat-messages'),
            chatInput: <HTMLElement>document.getElementById('chat-input'),
        };

        // Remove all of an element's children
        const clearElement = (el: HTMLElement) => {
            while (el.firstChild) {
                el.firstChild.remove();
            }
            return true;
        };

        // Remove all instances of an element from the document
        const purgeElement = (elementId: string) => {
            const copies = document.querySelectorAll(`#${elementId}`);
            for (let copy of copies) {
                copy.remove();
            }
        };

        // Button that cycles between stop/restart for single player games
        const makeStopButton = () => {
            purgeElement('spButton');
            purgeElement('stopButton');

            const stopButton = document.createElement('button');
            stopButton.innerText = 'Stop';
            stopButton.setAttribute('id', 'stopButton');
            stopButton.setAttribute('class', 'btn btn-danger');
            stopButton.addEventListener('click', () => {
                purgeElement('spButton');
                purgeElement('stopButton');
                this.socket.emit('stopGame');

                // Make a restart button
                const newGameButton = document.createElement('button');
                newGameButton.setAttribute('id', 'spButton');
                newGameButton.setAttribute('class', 'btn btn-success');
                newGameButton.innerText = 'Restart';
                newGameButton.addEventListener('click', () => {
                    this.socket.emit('startSinglePlayer');
                    purgeElement('spButton');
                    purgeElement('stopButton');
                });
                HTML.gameButtons.appendChild(newGameButton);
            });
            HTML.gameButtons.appendChild(stopButton);
        };

        this.game = new Game();
        this.game.drawEdges();

        this.socket = io({ transports: ['websocket'], upgrade: false });

        const handleDirectionChange = (e: KeyboardEvent) => {
            if (e.code == 'ArrowUp') {
                this.socket.emit('directionChange', 'up', this.gameState);
            } else if (e.code == 'ArrowDown') {
                this.socket.emit('directionChange', 'down', this.gameState);
            }
            return;
        };

        this.socket.on('connect', () => {
            window.addEventListener(
                'beforeunload',
                (e: BeforeUnloadEvent) => {
                    this.socket.disconnect();
                },
                false,
            );

            // Create the chat apparatus
            clearElement(HTML.chatInput);

            const messageInput = document.createElement('input');
            messageInput.setAttribute('id', 'messageText');
            messageInput.setAttribute('type', 'text');
            messageInput.setAttribute('placeholder', 'Chat (Enter to send)');

            messageInput.addEventListener('keydown', (e: KeyboardEvent) => {
                const key = e.code;
                if (key == 'Enter') {
                    sendMsg();
                    return false;
                } else {
                    messageInput.innerText = `${messageInput.innerText}${key}`;
                }
            });

            HTML.chatInput.appendChild(messageInput);
        });

        this.socket.on('playersUpdate', (playerData: Player[]) => {
            // Clear top section elements
            clearElement(HTML.playersOnline);
            clearElement(HTML.clientStatus);
            clearElement(HTML.welcomeMessage);
            clearElement(HTML.gameButtons);

            const isCurrentlyPlayingSP =
                this.gameState &&
                this.gameState.player2 &&
                this.gameState.player2.info._screenName == 'The Computer';

            // Remove any null objects from disconnects :^)
            const list: Player[] = [];
            for (let p of playerData) {
                if (p) list.push(p);
            }

            // Get name & color of each player
            const playerList = list.map((p) => {
                return { name: p._screenName, color: p._color };
            });

            // Create header
            const you = <Player>(
                playerData.find((player) => player._socketId == this.socket.id)
            );
            const yourName = document.createElement('span');
            yourName.innerText = you._screenName;
            yourName.style.color = you._color;

            const welcome = document.createElement('span');
            welcome.innerText = 'Welcome to Pong, ';
            HTML.welcomeMessage.appendChild(welcome);
            HTML.welcomeMessage.appendChild(yourName);

            // Display total number of players online
            const online = document.createElement('p');
            const isSinglePlayer = playerList.length == 1;
            online.innerText = `There ${
                !isSinglePlayer ? 'are' : 'is'
            } currently ${playerList.length} player${
                !isSinglePlayer ? 's' : ''
            } online.`;
            HTML.playersOnline.appendChild(online);

            if (!isSinglePlayer) {
                const spButton = <HTMLButtonElement>(
                    document.getElementById('spButton')
                );
                if (spButton) spButton.disabled = true;
            }
            this.spectator = you._spectator;

            clearElement(HTML.clientStatus);
            if (!isSinglePlayer) {
                if (this.spectator == true) {
                    const spectatorStatusNotice = document.createElement('p');
                    spectatorStatusNotice.setAttribute('id', 'spectatorStatus');
                    spectatorStatusNotice.innerText = `You're currently spectating.`;
                    HTML.clientStatus.appendChild(spectatorStatusNotice);
                }
            }

            // create the two game mode buttons and enable the correct one
            const spButton = document.createElement('button');
            spButton.setAttribute('id', 'spButton');
            spButton.setAttribute('class', 'btn btn-warning');
            spButton.innerText = 'Single player';

            const createMatchMakingButton = () => {
                purgeElement('mmButton');
                purgeElement('lqButton');

                // Cycles between join/leave queue.
                const matchmakingButton = document.createElement('button');
                matchmakingButton.innerText = 'Join Matchmaking';
                matchmakingButton.setAttribute('id', 'mmButton');
                matchmakingButton.setAttribute('class', 'btn btn-primary');
                matchmakingButton.addEventListener('click', () => {
                    this.socket.emit('joinMatchmaking');
                    purgeElement('mmButton');
                    purgeElement('lqButton');

                    const leaveQueueButton = document.createElement('button');
                    leaveQueueButton.innerText = 'Leave Matchmaking';
                    leaveQueueButton.setAttribute('id', 'lqButton');
                    leaveQueueButton.setAttribute('class', 'btn btn-primary');
                    leaveQueueButton.addEventListener('click', () => {
                        purgeElement('lqButton');
                        this.socket.emit('leaveMatchmaking');

                        createMatchMakingButton();
                    });
                    HTML.gameButtons.appendChild(leaveQueueButton);
                });
                HTML.gameButtons.appendChild(matchmakingButton);
            };

            purgeElement('spButton');
            HTML.gameButtons.appendChild(spButton);
            createMatchMakingButton();
            const mmButton = <HTMLButtonElement>(
                document.getElementById('mmButton')
            );

            if (isSinglePlayer) {
                spButton.disabled = false;
                spButton.addEventListener('click', () => {
                    this.socket.emit('startSinglePlayer');
                });
                mmButton.disabled = true;
            } else {
                // Enable the matchmaking button and remove the single player/leave buttons
                mmButton.disabled = false;
                spButton.disabled = true;

                mmButton.addEventListener('click', () => {
                    this.socket.emit('joinMatchmaking');

                    purgeElement('mmButton');
                    purgeElement('lqButton');

                    const leaveQueueButton = document.createElement('button');
                    leaveQueueButton.innerText = 'Leave Matchmaking';
                    leaveQueueButton.setAttribute('id', 'lqButton');
                    leaveQueueButton.setAttribute('class', 'btn btn-primary');
                    leaveQueueButton.addEventListener('click', () => {
                        purgeElement('lqButton');
                        this.socket.emit('leaveMatchmaking');

                        createMatchMakingButton();
                    });

                    HTML.gameButtons.appendChild(leaveQueueButton);
                });
            }

            purgeElement('leaveButton');

            if (!this.spectator && this.gameState) {
                // Keep the single player stop/restart & disconnect button in place as spectators join or leave ongoing games
                purgeElement('leaveButton');

                if (isCurrentlyPlayingSP) {
                    if (!document.getElementById('spButton')) {
                        makeStopButton();
                    }
                } else {
                    purgeElement('stopButton');
                    const leave = document.createElement('button');
                    leave.innerText = 'Disconnect';
                    leave.setAttribute('id', 'leaveButton');
                    leave.setAttribute('class', 'btn btn-danger');
                    leave.addEventListener('click', () => {
                        this.socket.disconnect();
                        purgeElement('leaveButton');
                        alert(
                            'You disconnected! Refresh the page if you would like to play or chat again.',
                        );
                    });

                    HTML.gameButtons.appendChild(leave);
                }
            }
        });

        this.socket.on(
            'playerDetails',
            (player: Player, spectator: boolean) => {
                this.screenName = player._screenName;
                this.color = player._color;
                this.spectator = spectator;

                if (this.spectator == true) {
                    clearElement(HTML.clientStatus);
                    const spectatorStatusNotice = document.createElement('p');
                    spectatorStatusNotice.innerText = `You're currently spectating.`;
                    HTML.clientStatus.appendChild(spectatorStatusNotice);
                }
            },
        );

        this.socket.on('gameUpdate', (gameState: GameState) => {
            if (!gameState) return;

            this.gameState = gameState;
            if (this.gameState.player1.info && this.gameState.player2.info) {
                if (isNaN(this.gameState.player1.info._score)) {
                    this.gameState.player1.info._score = 0;
                }
                if (isNaN(this.gameState.player2.info._score)) {
                    this.gameState.player2.info._score = 0;
                }
                this.renderScores(
                    this.gameState.player1.info,
                    this.gameState.player2.info,
                );
            }
            this.game.drawGameState(this.gameState);
        });

        this.socket.on(
            'singlePlayerGameStart',
            (gameState: GameState, playerId: string) => {
                purgeElement('leaveButton');
                if (playerId != this.socket.id) return;

                window.addEventListener(
                    'beforeunload',
                    (e: BeforeUnloadEvent) => {
                        this.socket.emit('stopGame');
                    },
                    false,
                );

                // Replace start button with stop button
                makeStopButton();

                document.addEventListener('keydown', handleDirectionChange);

                this.gameState = gameState;
                this.renderScores(
                    this.gameState.player1.info,
                    this.gameState.player2.info,
                );
                this.game.drawGameState(this.gameState);
            },
        );

        this.socket.on(
            'multiPlayerGameStart',
            (gameState: GameState, participantIds: string[]) => {
                purgeElement('leaveButton');
                purgeElement('stopButton');
                purgeElement('spButton');

                if (!participantIds.includes(this.socket.id)) {
                    this.spectator = true;

                    document.removeEventListener(
                        'keydown',
                        handleDirectionChange,
                    );
                    return;
                } else if (participantIds.includes(this.socket.id)) {
                    this.spectator = false;

                    document.addEventListener('keydown', handleDirectionChange);
                }

                clearElement(HTML.clientStatus);

                window.addEventListener(
                    'beforeunload',
                    (e: BeforeUnloadEvent) => {
                        this.socket.emit('stopGame');
                    },
                    false,
                );

                // Create the leave button and delete the other buttons
                purgeElement('mmButton');
                purgeElement('spButton');

                const leave = document.createElement('button');
                leave.innerText = 'Disconnect';
                leave.setAttribute('id', 'leaveButton');
                leave.setAttribute('class', 'btn btn-danger');
                leave.addEventListener('click', () => {
                    this.socket.disconnect();
                    let self = document.querySelectorAll('#leaveButton');
                    for (let el of self) {
                        el.remove();
                    }
                    alert(
                        'You disconnected! Refresh the page if you would like to play or chat again.',
                    );
                });
                HTML.gameButtons.appendChild(leave);

                document.addEventListener('keydown', handleDirectionChange);

                this.gameState = gameState;
                this.renderScores(
                    this.gameState.player1.info,
                    this.gameState.player2.info,
                );
                this.game.drawGameState(this.gameState);
            },
        );

        this.socket.on('chatMessage', (chatMessage: ChatMessage) => {
            const { from, message, source, color } = chatMessage;

            // Max 12 messages at a time; messages are max 255 chars
            if (HTML.chatMessages.childElementCount > 12) {
                HTML.chatMessages.children[0].remove();
            }

            const newMessage = document.createElement('p');
            newMessage.setAttribute('class', 'msg');
            newMessage.innerText = `${from}: ${message.substring(0, 255)} `;

            if (source == 'game') {
                newMessage.style.fontStyle = 'italic';
                newMessage.style.color = 'white';
            } else {
                newMessage.style.color = color || 'white';
            }

            HTML.chatMessages.appendChild(newMessage);
        });

        this.socket.on('gameStopped', () => {
            clearElement(HTML.gameButtons);
            this.game.drawEdges();

            // recreate matchmaking button
            const matchmakingButton = document.createElement('button');
            matchmakingButton.innerText = 'Join Matchmaking';
            matchmakingButton.setAttribute('id', 'mmButton');
            matchmakingButton.addEventListener('click', () => {
                this.socket.emit('joinMatchmaking');
            });
            HTML.gameButtons.appendChild(matchmakingButton);
        });

        this.socket.on('disconnect', (message: any) => {
            console.log('disconnected ' + message);
        });
    }

    public renderScores(player1: Player, player2: Player) {
        const scoreboard = <HTMLDivElement>(
            document.getElementById('scoreboard')
        );

        while (scoreboard.firstChild) {
            scoreboard.firstChild.remove();
        }

        const p1 = document.createElement('span');
        p1.innerText = `${player1._screenName}: ${player1._score}`;
        p1.style.color = player1._color;

        const p2 = document.createElement('span');
        p2.innerText = `${player2._screenName}: ${player2._score}`;
        p2.style.color = player2._color;

        scoreboard.appendChild(p1);
        scoreboard.appendChild(p2);
    }

    public sendMessage() {
        const form = <HTMLInputElement>document.getElementById('messageText');

        var messageText = form.value;
        if (messageText.length > 0) {
            this.socket.emit('chatMessage', <ChatMessage>{
                message: messageText,
                from: this.screenName,
                color: this.color,
            });
            form.setRangeText('', 0, messageText.length); // Clear the input form
        }
    }
}

const client = new Client();
