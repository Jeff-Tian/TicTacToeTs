import {Game} from "./GameAI";

test('game', () => {
    const game = new Game({})
    expect(game.getCurrentSquares().length).toBe(9)
});