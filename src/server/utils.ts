export const randomizeBallStartingAngle = (
    ballSpeed: number,
    isX: boolean,
    min: number,
    max: number,
): number => {
    const randomAngle = Math.random() * (max - min) + min;
    if (isX) {
        return ballSpeed * Math.cos(randomAngle);
    } else {
        return ballSpeed * -Math.sin(randomAngle);
    }
};

export const getRandomInt = (min: number, max: number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
};

export const serveBall = (
    x: number,
    y: number,
    servingLeft: boolean,
): GameState['ball'] => {
    const spd = getRandomInt(8, 16);
    const randomAngleX = randomizeBallStartingAngle(spd, true, 0, 40);
    let velocityX = spd * Math.cos(randomAngleX);
    if (servingLeft && velocityX > 0) {
        velocityX = Number(`-${velocityX}`);
    } else if (!servingLeft && velocityX < 0) {
        velocityX = Math.abs(velocityX);
    }

    const ball = {
        position: {
            x,
            y,
        },
        speed: spd,
        dx: velocityX,
        dy: randomizeBallStartingAngle(spd, false, 0, 40),
    };

    return ball;
};

export const reverseBallDirection = (d: number): number => {
    return d > 0 ? Number(`-${d}`) : Math.abs(d);
};

export const getPlayerCenter = (
    paddleHeight: number,
    pos: Position,
): number => {
    const y = paddleHeight / 2;
    return pos.y + y;
};

export const changeBallSpeed = (currentSpeed: number, prox: number): number => {
    if (prox >= 1) {
        return currentSpeed + 4;
    } else if (prox > 0) {
        return currentSpeed + 2;
    } else if (prox === 0) {
        return currentSpeed - 2;
    } else {
        return currentSpeed - 4;
    }
};

export const inRange = (x: number, min: number, max: number): boolean => {
    return x >= min && x <= max;
};
