export default class User implements Player {
    public _score: number = 0;
    public _screenName: string;
    public _color: string;
    public _socketId: string;
    public _spectator?: boolean;

    constructor(
        screenName: string,
        color: string,
        socketId: string,
        spectator: boolean,
    ) {
        this._screenName = screenName;
        this._color = color;
        this._socketId = socketId;
        this._spectator = spectator;
    }

    public get score(): number {
        return this._score;
    }

    public get color(): string {
        return this.color;
    }

    public get screenName(): string {
        return this._screenName;
    }

    public get player(): Player {
        return <Player>{
            _score: this._score,
            _screenName: this._screenName,
            _color: this._color,
            _socketId: this._socketId,
        };
    }

    public adjustScore(amount: number) {
        this._score += amount;
    }
}
