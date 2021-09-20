interface ChatMessage {
    message: string;
    from: string;
    source: 'player' | 'game';
    color?: string;
}

interface User {
    score: number;
    screenName: string;
    color: string;
    spectator: boolean;
    socketId: string;
}

interface Player {
    _score: number;
    _screenName: string;
    _color: string;
    _spectator?: boolean;
    _socketId: string;
}

type Position = { x: number; y: number };

interface GameState {
    player1: {
        info: Player;
        position: Position;
        direction: string;
    };
    player2: {
        info: Player;
        position: Position;
        direction: string;
    };
    ball: {
        position: Position;
        dx: number;
        dy: number;
        speed: number;
    };
}
