interface ChatMessage {
    message: string;
    from: string;
    source: 'player' | 'game';
    color?: 'string';
}

interface Player {
    _score: number;
    _screenName: string;
    _color: string;
    _socketId: string;
    _spectator: boolean;
}

type Position = { x: number; y: number };

interface GameState {
    player1: {
        info: Player;
        position: Position;
        direction: 'up' | 'down';
    };
    player2: {
        info: Player;
        position: Position;
        direction: 'up' | 'down';
    };
    ball: {
        position: Position;
        dx: number;
        dy: number;
    };
}
