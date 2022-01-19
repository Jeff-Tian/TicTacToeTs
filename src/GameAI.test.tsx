import {Game} from "./GameAI";


describe('game', () => {
    const game = new Game({})

    const TOTAL_SQUARES = 9
    test(`game's squares' length should be 9`, () => {
        expect(game.getCurrentSquares().length).toBe(TOTAL_SQUARES)
    });

    test(`all squares should be available before starting`, () => {
        const availableSquares = game.getAvailableSquares()
        expect(availableSquares.length).toBe(TOTAL_SQUARES)

        const indices = game.getAvailableSquareIndices()
        expect(indices).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    })
});