import {
    randomizeBallStartingAngle,
    serveBall,
    reverseBallDirection,
    getPlayerCenter,
    changeBallSpeed,
    getRandomInt,
    inRange,
} from './utils';
import RandomColorPicker from './randomColorPicker';

export default class Pong {
    private _gameInProgress: boolean;
    private _gameState: GameState;
    private _intervalId: NodeJS.Timer;
    private _updateChatCallback: (chatMessage: ChatMessage) => void;
    private _updateGameCallback: (gameState: GameState) => void;
    private _updatePlayerIdsCallback: (playerids: string[]) => void;

    static boardDimensions = {
        width: 700,
        height: 500,
    };
    static paddleHeight = 75;
    static maxBounceAngle = 75;

    constructor(
        updateChatCallback: (chatMessage: ChatMessage) => void,
        updateGameCallback: (gameState: GameState) => void,
        updatePlayerIdsCallback: (playerIds: string[]) => void,
    ) {
        this._gameInProgress = false;
        this._updateChatCallback = updateChatCallback;
        this._updateGameCallback = updateGameCallback;
        this._updatePlayerIdsCallback = updatePlayerIdsCallback;
    }

    public countdown(callback: Function): void {
        const broadcastCount = (count: number) => {
            const countdownMessage: ChatMessage = {
                from: 'PONG SERVER',
                message: count > 0 ? `${count}...` : 'Go!',
                source: 'game',
            };
            this._updateChatCallback(countdownMessage);
            setTimeout(
                () => {
                    if (count > 0) {
                        broadcastCount(count - 1);
                    } else {
                        this._gameInProgress = true;
                        callback();
                    }
                },
                count == 3 ? 500 : 1000,
            );
        };
        broadcastCount(3);
    }

    public isGameInProgress(): boolean {
        return this._gameInProgress;
    }

    public getGameState(): GameState {
        return this._gameState;
    }

    public updateGameState(gameState: GameState): void {
        this._gameState = gameState;
        this._updateGameCallback(this._gameState);
    }

    // Main function continously invoked at interval
    public pongGame() {
        const getGameState = this.getGameState.bind(this);
        const updateGame = this.updateGameState.bind(this);

        const gameLoop = () => {
            if (!this._gameInProgress) return;

            const { width, height } = Pong.boardDimensions;

            // Move players, update ball's velocity if any collisions are found, re-serve ball towards the other player if a someone scores a point, then emit the gameState for re-draw on client side.
            const frame = () => {
                let update = getGameState();
                if (!update) return;

                const isSp = update.player2.info._screenName === 'The Computer';

                // Move the players, reversing direction at the top/bottom of the board.
                const movePlayers = (gameState: GameState): GameState => {
                    let { player1, player2 } = gameState;
                    let players = [player1, player2];
                    for (let player of players) {
                        if (player.direction == 'up') {
                            if (player.position.y <= 0) {
                                player.direction = 'down';
                            } else {
                                player.position = {
                                    x: player.position.x,
                                    y: player.position.y - 10,
                                };
                            }
                        } else {
                            if (
                                player.position.y >=
                                Pong.boardDimensions.height - Pong.paddleHeight
                            ) {
                                player.direction = 'up';
                            } else {
                                player.position = {
                                    x: player.position.x,
                                    y: player.position.y + 10,
                                };
                            }
                        }
                    }

                    return gameState;
                };
                let update1 = movePlayers(update);

                // Check for collisions with players
                const checkPlayerCollisions = (
                    gameState: GameState,
                ): [GameState, boolean] => {
                    let { player1, player2, ball } = gameState;
                    let collisionFlag = false;
                    const p1center = getPlayerCenter(
                        Pong.paddleHeight,
                        player1.position,
                    );
                    const p2center = getPlayerCenter(
                        Pong.paddleHeight,
                        player2.position,
                    );

                    // Check for collision with p1 (Left side)
                    if (
                        inRange(
                            ball.position.x,
                            player1.position.x + 8,
                            player1.position.x + 22,
                        ) &&
                        (inRange(
                            ball.position.y,
                            player1.position.y,
                            player1.position.y + Pong.paddleHeight,
                        ) ||
                            inRange(
                                ball.position.y + 10,
                                player1.position.y,
                                player1.position.y + Pong.paddleHeight,
                            ))
                    ) {
                        collisionFlag = true;
                        let relativeIntersectY =
                            p1center + Pong.paddleHeight / 2 - ball.position.y;
                        let normalizedRelativeIntersectY =
                            relativeIntersectY / (Pong.paddleHeight / 2);

                        // Increase or decrease ball speed based on its promixity to paddle center.
                        changeBallSpeed(
                            ball.speed,
                            normalizedRelativeIntersectY,
                        );

                        // Then calculate the ball's new velocity.
                        let bounceAngle =
                            normalizedRelativeIntersectY * Pong.maxBounceAngle;
                        ball.dx = ball.speed * Math.cos(bounceAngle);
                        ball.dy = ball.speed * -Math.sin(bounceAngle);

                        // Prevent getting stuck.
                        ball.position.x = player1.position.x + 30;
                        if (ball.dx < 0) {
                            ball.dx = reverseBallDirection(ball.dx);
                        }
                    }

                    // Check for collision with p2 (Right side)
                    if (
                        inRange(
                            ball.position.x,
                            player2.position.x - 12,
                            player2.position.x + 2,
                        ) &&
                        (inRange(
                            ball.position.y,
                            player2.position.y,
                            player2.position.y + Pong.paddleHeight,
                        ) ||
                            inRange(
                                ball.position.y + 10,
                                player2.position.y,
                                player2.position.y + Pong.paddleHeight,
                            ))
                    ) {
                        collisionFlag = true;
                        let relativeIntersectY =
                            p2center + Pong.paddleHeight / 2 - ball.position.y;
                        let normalizedRelativeIntersectY =
                            relativeIntersectY / (Pong.paddleHeight / 2);

                        // Increase or decrease ball speed based on its promixity to paddle center.
                        changeBallSpeed(
                            ball.speed,
                            normalizedRelativeIntersectY,
                        );

                        // Then calculate the ball's new velocity.
                        let bounceAngle =
                            normalizedRelativeIntersectY * Pong.maxBounceAngle;
                        ball.dx = ball.speed * Math.cos(bounceAngle);
                        ball.dy = ball.speed * -Math.sin(bounceAngle);

                        // Prevent getting stuck.
                        ball.position.x = player2.position.x - 20;
                        if (ball.dx > 0) {
                            ball.dx = reverseBallDirection(ball.dx);
                        }
                    }

                    return [gameState, collisionFlag];
                };
                let update2 = checkPlayerCollisions(update1);
                // update2[0] = the game State, [1] = boolean for whether there was a player collision

                let finalUpdate = update2[0];

                // Check for collisions with walls if no player collisions
                if (!update2[1]) {
                    const checkWallCollisions = (
                        gameState: GameState,
                    ): [GameState, boolean] => {
                        let { player1, player2, ball } = gameState;
                        const goalLeft = ball.position.x < 0;
                        const goalRight = ball.position.x > width;
                        const hitTop = ball.position.y < 10;
                        const hitBot = ball.position.y > height - 10;
                        let collisionFlag = false;
                        if (goalLeft || goalRight) {
                            // Award point to the correct player and re-serve the ball towards the other player in a multiplayer game, or towards the human in a singleplayer game.

                            collisionFlag = true;
                            if (goalRight) {
                                !player1.info._score
                                    ? (player1.info._score = 1)
                                    : player1.info._score++;
                            } else if (goalLeft) {
                                !player2.info._score
                                    ? (player2.info._score = 1)
                                    : player2.info._score++;
                            }

                            const shouldServeLeft = isSp || goalLeft;

                            const serve = serveBall(
                                width / 2,
                                height / 2,
                                shouldServeLeft,
                            );
                            const { position, speed, dx, dy } = serve;
                            ball.position = position;
                            ball.speed = speed;
                            ball.dx = dx;
                            ball.dy = dy;
                        } else if (hitTop || hitBot) {
                            // Reverse Y direction + increase speed
                            collisionFlag = true;
                            ball.dy = reverseBallDirection(ball.dy);

                            if (ball.dx < 0) {
                                ball.dx = ball.dx - 0.1;
                            } else {
                                ball.dx = ball.dx + 0.1;
                            }

                            if (ball.dy < 0) {
                                ball.dy = ball.dy - 0.1;
                            } else {
                                ball.dy = ball.dy + 0.1;
                            }

                            // Prevent getting stuck
                            if (hitTop) {
                                ball.position.y = ball.position.y + 20;
                            } else {
                                ball.position.y = ball.position.y - 20;
                            }
                        }

                        return [gameState, collisionFlag];
                    };
                    // update3[0] = the game State, [1] = boolean for whether there was a wall collision
                    let update3 = checkWallCollisions(update2[0]);

                    // Move the ball if there were no collisions, slightly increasing its velocity.
                    if (!update3[1]) {
                        const moveBall = (gameState: GameState): GameState => {
                            let { ball } = gameState;

                            if (ball.dx < 0) {
                                ball.dx = ball.dx - 0.1;
                            } else {
                                ball.dx = ball.dx + 0.1;
                            }

                            if (ball.dy < 0) {
                                ball.dy = ball.dy - 0.1;
                            } else {
                                ball.dy = ball.dy + 0.1;
                            }

                            ball.position = <Position>{
                                x: ball.position.x + ball.dx,
                                y: ball.position.y + ball.dy,
                            };

                            // If it's a single player game, additionally update the computer's direction based on new ball velocity.
                            if (isSp) {
                                let { player2 } = gameState;
                                player2.direction = this.computerIntelligence(
                                    ball.dx,
                                    ball.dy,
                                    ball.position,
                                    player2.position,
                                );
                            }

                            return gameState;
                        };
                        finalUpdate = moveBall(update3[0]);
                    }
                }

                updateGame(finalUpdate);
            };
            frame();
        };

        this._intervalId = setInterval(gameLoop, 90);
    }

    public startMultiPlayerGame(player1: Player, player2: Player) {
        let initialGameState = {
            player1: {
                info: player1,
                direction: 'up',
                position: {
                    x: 5,
                    y: Pong.boardDimensions.height / 2 - Pong.paddleHeight / 2,
                },
            },
            player2: {
                info: player2,
                direction: 'up',
                position: {
                    x: Pong.boardDimensions.width - 15,
                    y: Pong.boardDimensions.height / 2 - Pong.paddleHeight / 2,
                },
            },
            ball: {
                position: {
                    x: Pong.boardDimensions.width / 2,
                    y: Pong.boardDimensions.height / 2,
                },
                speed: getRandomInt(8, 16),
                dx: randomizeBallStartingAngle(15, true, -75, 75),
                dy: randomizeBallStartingAngle(15, false, -75, 75),
            },
        };

        initialGameState.player1.info._score = 0;
        initialGameState.player2.info._score = 0;

        this._gameInProgress = true;
        this._gameState = initialGameState;
        this.pongGame();
    }

    public startSinglePlayerGame(player: Player) {
        let colorPicker = new RandomColorPicker();
        const excludePlayerColor = (toExclude: string) => {
            let random = colorPicker.pickColor();
            if (random == toExclude) excludePlayerColor(toExclude);
            else return random;
        };
        let reallyEasyOpponent = {
            info: {
                _color: excludePlayerColor(player._color),
                _score: 0,
                _screenName: 'The Computer',
                _socketId: '010101',
            },
            direction: 'up',
            position: {
                x: Pong.boardDimensions.width - 15,
                y: Pong.boardDimensions.height / 2 - Pong.paddleHeight / 2,
            },
        };

        let initialGameState = {
            player1: {
                info: player,
                direction: 'up',
                position: {
                    x: 5,
                    y: Pong.boardDimensions.height / 2 - Pong.paddleHeight / 2,
                },
            },
            player2: reallyEasyOpponent,
            ball: serveBall(
                Pong.boardDimensions.width / 2,
                Pong.boardDimensions.height / 2,
                true,
            ),
        };

        this._gameInProgress = true;
        this._gameState = initialGameState;
        this.pongGame();
    }

    public computerIntelligence(
        ballVx: number,
        ballVy: number,
        currentBallPos: Position,
        currentPaddlePos: Position,
    ): string {
        // The computer's behavior is different based on whether the ball is moving towards it or the player
        if (ballVx < 0) {
            // While the ball is moving towards player, the computer usually matches the ball's Y direction but sometimes moves randomly :^)
            const randomDirection = (): string => {
                return Math.random() < 0.5 ? 'up' : 'down';
            };
            const shouldMatchBallY = Math.random() < 0.75;
            if (shouldMatchBallY) {
                return ballVy < 0 ? 'up' : 'down';
            } else {
                return randomDirection();
            }
        } else {
            // While the ball is moving towards computer, it matches its velocity when it is far, and tries to predict its movement when it is getting close
            const distance = Pong.boardDimensions.width - 20 - currentBallPos.x;
            const center = getPlayerCenter(Pong.paddleHeight, currentPaddlePos);
            if (distance < 200) {
                const prediction = currentBallPos.y + ballVy;
                return prediction < center ? 'up' : 'down';
            } else {
                return ballVy < 0 ? 'up' : 'down';
            }
        }
    }

    public stop() {
        clearInterval(this._intervalId);
        this._gameInProgress = false;
    }
}
