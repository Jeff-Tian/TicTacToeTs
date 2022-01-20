import React from 'react';

function Square(props) {
    return (
        <button className="square" onClick={props.onClick}>
            {props.value}
        </button>
    );
}

class Board extends React.Component {
    renderSquare(i) {
        return (
            <Square
                value={this.props.squares[i]}
                onClick={() => this.props.onClick(i)}
            />
        );
    }

    render() {
        return (
            <div>
                <div className="board-row">
                    {this.renderSquare(0)}
                    {this.renderSquare(1)}
                    {this.renderSquare(2)}
                </div>
                <div className="board-row">
                    {this.renderSquare(3)}
                    {this.renderSquare(4)}
                    {this.renderSquare(5)}
                </div>
                <div className="board-row">
                    {this.renderSquare(6)}
                    {this.renderSquare(7)}
                    {this.renderSquare(8)}
                </div>
            </div>
        );
    }
}

export class Game extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            history: [
                {
                    squares: Array(9).fill(null)
                }
            ],
            stepNumber: 0,
            xIsNext: true
        };
    }

    handleXClick(i, callback = undefined) {
        console.log('clicking ', i, '...');
        if (i === undefined) {
            return
        }
        const history = this.state.history.slice(0, this.state.stepNumber + 1);
        const current = history[history.length - 1];
        const squares = current.squares.slice();
        if (calculateWinner(squares) || squares[i]) {
            return;
        }
        squares[i] = this.state.xIsNext ? "X" : "O";
        this.setState({
            history: history.concat([
                {
                    squares: squares
                }
            ]),
            stepNumber: history.length,
            xIsNext: !this.state.xIsNext
        }, callback);
    }

    simulateOClick() {
        // const [firstAvailableSquareIndex] = this.getAvailableSquareIndices()
        const firstAvailableSquareIndex = new AI().nextMove(convertsSquaresToBitmap(this.getCurrentSquares()))
        if (firstAvailableSquareIndex === null) {
            console.error(`玩家 O 尝试在位置 ${firstAvailableSquareIndex} 走子，但是已经没有空余的格子了！`)
            return
        }

        this.handleXClick(firstAvailableSquareIndex)
    }

    getCurrentSquares() {
        const history = this.state.history.slice(0, this.state.stepNumber + 1);
        const current = history[history.length - 1];
        return current.squares.slice();
    }

    getAvailableSquares() {
        return this.getCurrentSquares().filter(q => !q)
    }

    getAvailableSquareIndices() {
        return this.getCurrentSquares().map((q, i) => ({
            index: i,
            available: !q
        })).filter(q => q.available).map(q => q.index)
    }

    jumpTo(step) {
        this.setState({
            stepNumber: step,
            xIsNext: (step % 2) === 0
        });
    }

    render() {
        const history = this.state.history;
        const current = history[this.state.stepNumber];
        const winner = calculateWinner(current.squares);

        const moves = history.map((step, move) => {
            const desc = move ?
                'Go to move #' + move :
                'Go to game start';
            return (
                <li key={move}>
                    <button onClick={() => this.jumpTo(move)}>{desc}</button>
                </li>
            );
        });

        let status;
        if (winner) {
            status = "Winner: " + winner;
        } else {
            status = "Next player: " + (this.state.xIsNext ? "X" : "O");
        }

        return (
            <div className="game">
                <div className="game-board">
                    <Board
                        squares={current.squares}
                        onClick={i => {
                            this.handleXClick(i, this.simulateOClick);
                        }}
                    />
                </div>
                <div className="game-info">
                    <div>{status}</div>
                    <ol>{moves}</ol>
                </div>
            </div>
        );
    }
}

function calculateWinner(squares) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    return null;
}

let latestFactors = null;

export class AI {
    constructor() {
        this.weights = Object.assign([], Strategy.getInitialWeights());
        this.setWeightsUpdatedCallback(function () {
        });
    }

    static nextMove(squares, weights) {
        spotScoreMap.clear();
        let spots = Judger.getSpots(squares);
        let nextBoards = Judger.generateNewBoardsBySpots(squares, spots);
        let scores = nextBoards.map(b => Judger.getBoardScore(b, weights).total);

        for (let i = 0; i < spots.length; i++) {
            const spot = spots[i];
            const score = scores[i];

            spotScoreMap.set(spot, {
                weights: weights,
                strategy: Strategy.getBoardStatus(squares).factors,
                score: score,
            });
        }

        console.log('scores = ', scores);
        let index = ArrayHelper.findIndexOfMax(scores);
        console.log('index = ', index, scores[index]);
        console.log('spot = ', spots, spots[index])

        latestFactors = scores[index]?.namedFactors;

        return spots[index];
    }

    setWeightsUpdatedCallback(cb) {
        this.weightsUpdatedCallback = cb;
    }

    nextMove(squares) {
        this.tryLearn(squares);
        return AI.nextMove(squares, this.weights);
    }

    tryLearn(squares) {
        this.learn(this.lastBitmapSquares, squares);
        this.lastBitmapSquares = squares;
    }

    clean() {
        latestFactors = null;
    }

    getWeights() {
        return this.weights;
    }

    getFactors() {
        return latestFactors;
    }

    setWeights(weights) {
        this.weights = weights;
    }

    learn(lastSquares, currentSquares) {
        if (!lastSquares) {
            return;
        }

        if (!GlobalSettings.learn) {
            return;
        }

        let estimatedLastScore = Judger.getBoardScore(lastSquares, this.weights);
        let actualScore = Judger.getBoardScore(currentSquares, this.weights);
        let diff = actualScore.total - estimatedLastScore.total;

        for (let i = 0; i < estimatedLastScore.factors.length; i++) {
            this.weights[i] = this.weights[i] + 0.1 * diff * estimatedLastScore.factors[i];
        }

        this.weightsUpdatedCallback(this.weights);
    }
}

const boardSides = {
    top: [0, 1, 2],
    left: [0, 3, 6],
    right: [2, 5, 8],
    bottom: [6, 7, 8],
    center: [3, 4, 5],
    middle: [1, 4, 7],
    slash: [2, 4, 6],
    antiSlash: [0, 4, 8]
};

const sides = [
    boardSides.top,
    boardSides.center,
    boardSides.bottom,
    boardSides.left,
    boardSides.middle,
    boardSides.right,
    boardSides.slash,
    boardSides.antiSlash
];

function checkSides(bitmap) {
    let d = 0;
    let dead = 0;
    let w = 0;
    let c = 0;

    for (let i = 0; i < sides.length; i++) {
        let side = bitmap.filter((_, j) => sides[i].indexOf(j) >= 0);

        let negatives = side.filter(b => b === -1);
        let zeros = side.filter(b => b === 0);
        let ones = side.filter(b => b === 1);

        if (negatives.length === 2 && zeros.length === 1) {
            d++;
        }

        if (negatives.length === 3) {
            dead++;
        }

        if (ones.length === 3) {
            w++;
        }

        if (ones.length === 2 && zeros.length === 1) {
            c++;
        }
    }

    return {danger: d, lost: dead, chance: c, win: w};
}

let initialWeights = [0, 1, 1];
let namedStrategy = (factors) => {
    return {
        const: factors[0],
        danger: factors[1],
        occupyCenter: factors[2],
    };
}

export class StrategySettings {
    static setInitialWeights(iw) {
        initialWeights = iw;
    }

    static setNamedStrategy(func) {
        namedStrategy = func;
    }
}

export default class Strategy {
    static getInitialWeights() {
        return initialWeights;
    }

    static getNamedStrategy(factors) {
        return namedStrategy(factors);
    }

    static getBoardStatus(bitmap) {
        let {danger, lost, chance, win} = checkSides(bitmap);
        return {
            danger, lost, chance, win,
            factors: Object.keys(namedStrategy(Strategy.getInitialWeights())).map(key => {
                return {
                    const: 1,
                    danger: danger * 1.1,
                    occupyCenter: bitmap[4] === 1 ? 1 : 0,
                    intersectedBads: Strategy.getIntersectedBads(bitmap) / 2,
                    chance: chance,
                    numberOfBadsOfMyChance: Strategy.getNumberOfBadsOfMyChancePosition(bitmap)
                }[key];
            })
        };
    }

    static getIntersectedBads(bitmap) {
        let intersectedBads = 0;
        const bads = [];

        for (let i = 0; i < sides.length; i++) {
            let side = bitmap.filter((_, j) => sides[i].indexOf(j) >= 0);

            const [v1, v2, v3] = side;

            if ((v1 === -1 && v2 === 0 && v3 === 0) ||
                (v1 === 0 && v2 === -1 && v3 === 0) ||
                (v1 === 0 && v2 === 0 && v3 === -1) ||

                (v1 === -1 && v2 === -1 && v3 === 0) ||
                (v1 === -1 && v2 === 0 && v3 === -1) ||
                (v1 === 0 && v2 === -1 && v3 === -1)
            ) {
                bads.push(sides[i]);
            }
        }

        if (bads.length <= 1) {
            return 0;
        }

        for (let i = 0; i < bads.length - 1; i++) {
            for (let j = i + 1; j < bads.length; j++) {
                const bad1 = bads[i];
                const bad2 = bads[j];

                const intersects = ArrayHelper.intersects(bad1, bad2);

                if (intersects.length > 0 && (bitmap[intersects[0]] === 0 || bitmap[intersects[0]] === -1)) {
                    intersectedBads++;
                }
            }
        }

        return intersectedBads;
    }

    static getNumberOfBadsOfMyChancePosition(bitmap) {
        let sum = 0;

        for (let i = 0; i < sides.length; i++) {
            let sideValues = bitmap.filter((_, j) => sides[i].indexOf(j) >= 0);

            let zeros = sideValues.filter(b => b === 0);
            let ones = sideValues.filter(b => b === 1);

            if (ones.length === 2 && zeros.length === 1) {
                const theChance = sides[i].filter(index => bitmap[index] === 0)[0];

                if (theChance !== undefined) {
                    let sidesContainsTheChancePosition = sides.filter(s => s.indexOf(theChance) >= 0);

                    for (const s of sidesContainsTheChancePosition) {
                        let sValues = bitmap.filter((_, j) => s.indexOf(j) >= 0);

                        let n = sValues.filter(b => b === -1).length;
                        let p = sValues.filter(b => b === 1).length;

                        if (n > 0 && p === 0) {
                            sum++;
                        }
                    }
                }
            }
        }

        return sum;
    }
}

const ArrayHelper = {
    convertIndexToRowColumn(rowLength, index) {
        return {
            col: (index % rowLength) + 1,
            row: Math.floor(index / rowLength) + 1
        }
    },
    is2DArray: function (array) {
        return array[0] instanceof Array;
    },
    getRowColumnByIndex(array, index) {
        if (this.is2DArray(array)) {
            return this.convertIndexToRowColumn(array[0].length, index);
        }

        return this.convertIndexToRowColumn(Math.sqrt(array.length), index);
    },

    findIndexOfMax(array) {
        let index = 0;
        let max = array[0];

        for (let i = 1; i < array.length; i++) {
            if (array[i] > max) {
                max = array[i];
                index = i;
            }
        }

        return index;
    },

    intersects(a1, a2) {
        const res = [];
        for (const e1 of a1) {
            if (a2.indexOf(e1) >= 0) {
                res.push(e1);
            }
        }

        return res;
    }
}

export const spotScoreMap = new Map();

let defaultSettings = {
    // learn: true,
    // showLearningStatus: false,
    language: ['en-US']
};
export const GlobalSettings = {
    ...defaultSettings
};

StrategySettings.setInitialWeights([0, -2, -1, 1, 1.5, -1]);
StrategySettings.setNamedStrategy((factors) => {
    return {
        const: factors[0],
        danger: factors[1],
        intersectedBads: factors[2],
        chance: factors[3],
        occupyCenter: factors[4],
        numberOfBadsOfMyChance: factors[5]
    };
})

const Judger = {
    getBoardScore: function (bitmap, weights) {
        weights = weights || Strategy.getInitialWeights();

        let {lost, win, factors} = Strategy.getBoardStatus(bitmap);

        if (lost) {
            return {
                factors: factors,
                namedFactors: Strategy.getNamedStrategy(factors),
                total: -Math.PI / 2
            }
        }

        if (win) {
            return {
                factors: factors,
                namedFactors: Strategy.getNamedStrategy(factors),
                total: Math.PI / 2
            }
        }

        let score = Math.atan(factors.map((s, i) => s * weights[i]).reduce((prev, next) => prev + next, 0));

        return {
            factors: factors,
            namedFactors: Strategy.getNamedStrategy(factors),
            total: score
        };
    },

    getSpots(bitmapSquares) {
        return bitmapSquares.map((s, i) => s === 0 ? i : NaN).filter(n => !isNaN(n));
    },

    generateNewBoardsBySpots(currentBoard, spots) {
        spots = spots || this.getSpots(currentBoard);

        return spots.map(i => {
            let newSquares = currentBoard.slice();
            newSquares[i] = 1;

            return newSquares;
        });
    },

    gameProgress(bitmapSquares) {
        let emptySpots = bitmapSquares.filter(b => b === 0);

        if (emptySpots.length === bitmapSquares.length) {
            return {
                win: false,
                lost: false,
                fair: false
            }
        }

        for (let i = 0; i < sides.length; i++) {
            const theSide = sides[i];

            let side = bitmapSquares.filter((_, j) => theSide.indexOf(j) >= 0);

            let ones = side.filter(b => b === 1);
            let negatives = side.filter(b => b === -1);

            if (ones.length === 3) {
                return {
                    win: theSide,
                    lost: false,
                    fair: false
                };
            }

            if (negatives.length === 3) {
                return {
                    win: false,
                    lost: theSide,
                    fair: false
                };
            }
        }

        return {
            win: false,
            lost: false,
            fair: emptySpots.length === 0
        }
    },

    gameEnds(progress) {
        return progress.fair || progress.win || progress.lost;
    }
}

export const convertsSquaresToBitmap = (squares: Array<string | null>) => squares.map(q => q === 'X' ? -1 : (q === 'O' ? 1 : 0))