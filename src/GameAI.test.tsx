import {AI, convertsSquaresToBitmap, Game} from "./GameAI";

describe('Game AI', () => {

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

    describe('AI', () => {
        const game = new Game({})

        test('converts squares to bitmap', () => {
            const res = convertsSquaresToBitmap(game.getCurrentSquares())
            expect(res).toStrictEqual([
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            ])
        })

        test('gets next move', () => {
            const res = new AI().nextMove(convertsSquaresToBitmap(game.getCurrentSquares()))
            expect(res).toEqual(4)
        })
    });
})