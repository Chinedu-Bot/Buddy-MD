const { MessageType } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

class LudoAI {
    constructor(player, game) {
        this.player = player;
        this.game = game;
    }

    makeMove() {
        const roll = this.game.rollDice();
        const possibleMoves = this.getPossibleMoves(roll);

        if (possibleMoves.length === 0) return null;

        const scoredMoves = possibleMoves.map(move => ({
            move,
            score: this.evaluateMove(move, roll)
        }));

        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves[0].move;
    }

    getPossibleMoves(roll) {
        return this.game.pawns[this.player]
            .map((pawn, index) => ({ index, position: pawn.position }))
            .filter(pawn =>
                (pawn.position === -1 && roll === 6) ||
                (pawn.position !== -1 && pawn.position !== 'home')
            );
    }

    evaluateMove(move, roll) {
        let score = 0;
        const newPosition = (move.position + roll) % 52;


        if (move.position === -1 && roll === 6) score += 100;


        if (this.game.isInHomeStretch(this.player, newPosition)) score += 75;


        if (this.canCapture(newPosition)) score += 50;


        if (this.isInDangerZone(newPosition)) score -= 25;

        return score;
    }

    canCapture(position) {
        for (const player of this.game.players) {
            if (player !== this.player) {
                if (this.game.pawns[player].some(pawn => pawn.position === position)) {
                    return true;
                }
            }
        }
        return false;
    }

    isInDangerZone(position) {
        for (const player of this.game.players) {
            if (player !== this.player) {
                if (this.game.pawns[player].some(pawn =>
                    pawn.position !== -1 &&
                    pawn.position !== 'home' &&
                    (pawn.position + 1) % 52 === position ||
                    (pawn.position + 2) % 52 === position ||
                    (pawn.position + 3) % 52 === position
                )) {
                    return true;
                }
            }
        }
        return false;
    }
}

class LudoGame {
    constructor(customBoard = null) {
        this.board = customBoard || this.createDefaultBoard();
        this.players = ['red', 'green', 'yellow', 'blue'];
        this.currentPlayer = 0;
        this.pawns = {
            red: [{ position: -1 }, { position: -1 }, { position: -1 }, { position: -1 }],
            green: [{ position: -1 }, { position: -1 }, { position: -1 }, { position: -1 }],
            yellow: [{ position: -1 }, { position: -1 }, { position: -1 }, { position: -1 }],
            blue: [{ position: -1 }, { position: -1 }, { position: -1 }, { position: -1 }]
        };
        this.homeStretch = {
            red: [52, 53, 54, 55, 56],
            green: [13, 14, 15, 16, 17],
            yellow: [26, 27, 28, 29, 30],
            blue: [39, 40, 41, 42, 43]
        };
        this.startPositions = { red: 0, green: 13, yellow: 26, blue: 39 };
        this.ai = {
            red: new LudoAI('red', this),
            green: new LudoAI('green', this),
            yellow: new LudoAI('yellow', this),
            blue: new LudoAI('blue', this)
        };
    }

    createDefaultBoard() {
        return new Array(52).fill(null).map((_, index) => ({
            position: index,
            type: 'normal',
            safe: [0, 8, 13, 21, 26, 34, 39, 47].includes(index)
        }));
    }

    rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    movePawn(player, pawnIndex, steps) {
        const pawn = this.pawns[player][pawnIndex];
        if (pawn.position === -1 && steps === 6) {
            pawn.position = this.startPositions[player];
        } else if (pawn.position !== -1) {
            let newPosition = (pawn.position + steps) % 52;
            if (this.isInHomeStretch(player, newPosition)) {
                if (newPosition === this.homeStretch[player][4]) {
                    pawn.position = 'home';
                } else {
                    pawn.position = newPosition;
                }
            } else {
                pawn.position = newPosition;
                this.checkCapture(player, newPosition);
            }
        }
    }

    isInHomeStretch(player, position) {
        return position >= this.homeStretch[player][0] && position <= this.homeStretch[player][4];
    }

    checkCapture(player, position) {
        for (const otherPlayer of this.players) {
            if (otherPlayer !== player) {
                for (let i = 0; i < 4; i++) {
                    if (this.pawns[otherPlayer][i].position === position && !this.board[position].safe) {
                        this.pawns[otherPlayer][i].position = -1;
                    }
                }
            }
        }
    }

    isGameOver() {
        for (const player of this.players) {
            if (this.pawns[player].every(pawn => pawn.position === 'home')) {
                return player;
            }
        }
        return false;
    }

    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.players[this.currentPlayer],
            pawns: this.pawns
        };
    }

    nextTurn() {
        this.currentPlayer = (this.currentPlayer + 1) % 4;
    }
}

class PlayerStats {
    constructor(playerId) {
        this.playerId = playerId;
        this.gamesPlayed = 0;
        this.gamesWon = 0;
        this.totalMoves = 0;
        this.pawnsLost = 0;
        this.pawnsFinished = 0;
    }

    updateStats(gameResult) {
        this.gamesPlayed++;
        if (gameResult.winner === this.playerId) this.gamesWon++;
        this.totalMoves += gameResult.moves[this.playerId];
        this.pawnsLost += gameResult.pawnsLost[this.playerId];
        this.pawnsFinished += gameResult.pawnsFinished[this.playerId];
    }

    getStatsMessage() {
        return `📊 *Stats for ${this.playerId}*\n` +
            `🎲 Games Played: ${this.gamesPlayed}\n` +
            `🏆 Games Won: ${this.gamesWon}\n` +
            `🔢 Win Rate: ${((this.gamesWon / this.gamesPlayed) * 100).toFixed(2)}%\n` +
            `🚶 Average Moves: ${(this.totalMoves / this.gamesPlayed).toFixed(2)}\n` +
            `💀 Pawns Lost: ${this.pawnsLost}\n` +
            `🏁 Pawns Finished: ${this.pawnsFinished}`;
    }
}

class LudoCommand {
    static games = new Map();
    static playerStats = new Map();

    constructor() {
        this.customBoards = this.loadCustomBoards();
    }

    loadCustomBoards() {
        const boardsPath = path.join('./src/Commands/Game/custom_boards');
        const boards = {};
        fs.readdirSync(boardsPath).forEach(file => {
            if (file.endsWith('.json')) {
                const boardName = path.basename(file, '.json');
                const boardData = JSON.parse(fs.readFileSync(path.join(boardsPath, file)));
                boards[boardName] = boardData;
            }
        });
        return boards;
    }

    async execute(sock, m) {
        const groupId = m.key.remoteJid;
        let game = LudoCommand.games.get(groupId);

        const messageContent = m.message.extendedTextMessage?.text || m.message.conversation;
        const [command, ...args] = messageContent.slice(1).split(' ');

        switch (args[0].toLowerCase()) {
            case 'start':
                await this.handleStart(sock, m, args);
                break;
            case 'roll':
                await this.handleRoll(sock, m, game);
                break;
            case 'move':
                await this.handleMove(sock, m, game, args);
                break;
            case 'status':
                await this.sendGameStatus(sock, m, game);
                break;
            case 'stats':
                await this.sendPlayerStats(sock, m, args[1]);
                break;
            case 'boards':
                await this.sendAvailableBoards(sock, m);
                break;
            default:
                await sock.sendMessage(groupId, { text: '❌ Invalid command. Use !ludo start, roll, move, status, stats, or boards.' });
        }
    }

    async handleStart(sock, m, args) {
        const groupId = m.key.remoteJid;

        if (LudoCommand.games.has(groupId)) {
            await sock.sendMessage(groupId, { text: '❌ A game is already in progress. Finish it or use !ludo end to stop it.' });
            return;
        }

        const boardName = args[0];
        const customBoard = this.customBoards[boardName];
        const game = new LudoGame(customBoard);
        LudoCommand.games.set(groupId, game);

        const boardMessage = customBoard ? `using custom board: ${boardName}` : 'with the default board';
        await sock.sendMessage(groupId, { text: `🎉 New Ludo game started ${boardMessage}! Type !ludo roll to play.` });
    }

    async handleRoll(sock, m, game) {
        const groupId = m.key.remoteJid;
        if (!game) {
            await sock.sendMessage(groupId, { text: '❌ No game in progress. Start a new game with !ludo start.' });
            return;
        }

        const roll = game.rollDice();
        const currentPlayer = game.players[game.currentPlayer];
        await sock.sendMessage(groupId, { text: `🎲 ${this.getPlayerEmoji(currentPlayer)} rolled a *${roll}*!` });

        const possibleMoves = game.pawns[currentPlayer].map((pawn, index) => {
            if (pawn.position === -1 && roll === 6) return index;
            if (pawn.position !== -1 && pawn.position !== 'home') return index;
            return null;
        }).filter(index => index !== null);

        if (possibleMoves.length === 0) {
            await sock.sendMessage(groupId, { text: `😔 No possible moves. Next player's turn.` });
            game.nextTurn();
            await this.sendGameStatus(sock, m, game);
        } else {
            const moveOptions = possibleMoves.map(index => `!ludo move ${index}`).join(', ');
            await sock.sendMessage(groupId, { text: `🤔 Possible moves: ${moveOptions}` });
        }
    }

    async handleMove(sock, m, game, args) {
        const groupId = m.key.remoteJid;
        if (!game) {
            await sock.sendMessage(groupId, { text: '❌ No game in progress. Start a new game with !ludo start.' });
            return;
        }

        const currentPlayer = game.players[game.currentPlayer];
        const pawnIndex = parseInt(args[1]);

        if (isNaN(pawnIndex) || pawnIndex < 0 || pawnIndex > 3) {
            await sock.sendMessage(groupId, { text: '❌ Invalid pawn index. Use 0, 1, 2, or 3.' });
            return;
        }

        const roll = game.rollDice();
        game.movePawn(currentPlayer, pawnIndex, roll);

        await sock.sendMessage(groupId, { text: `${this.getPlayerEmoji(currentPlayer)} moved pawn ${pawnIndex} by ${roll} steps.` });

        const winner = game.isGameOver();
        if (winner) {
            await sock.sendMessage(groupId, { text: `🏆 Game over! ${this.getPlayerEmoji(winner)} *${winner.toUpperCase()}* wins!` });
            this.updatePlayerStats(groupId, winner);
            LudoCommand.games.delete(groupId);
        } else {
            game.nextTurn();
            await this.sendGameStatus(sock, m, game);
        }
    }

    async sendGameStatus(sock, m, game) {
        const groupId = m.key.remoteJid;
        if (!game) {
            await sock.sendMessage(groupId, { text: '❌ No game in progress. Start a new game with !ludo start.' });
            return;
        }

        const state = game.getGameState();
        let statusMessage = `🎮 *Current Game Status*\n\n`;
        statusMessage += `Current player: ${this.getPlayerEmoji(state.currentPlayer)} *${state.currentPlayer.toUpperCase()}*\n\n`;

        for (const player of game.players) {
            statusMessage += `${this.getPlayerEmoji(player)} *${player.toUpperCase()}*:\n`;
            state.pawns[player].forEach((pawn, index) => {
                const position = pawn.position === -1 ? '🏠' : pawn.position === 'home' ? '🏁' : `🔢 ${pawn.position}`;
                statusMessage += `  Pawn ${index}: ${position}\n`;
            });
            statusMessage += '\n';
        }

        await sock.sendMessage(groupId, { text: statusMessage });
    }

    async sendPlayerStats(sock, m, playerId) {
        const groupId = m.key.remoteJid;
        if (!playerId) {
            await sock.sendMessage(groupId, { text: '❌ Please specify a player ID.' });
            return;
        }

        let stats = LudoCommand.playerStats.get(playerId);
        if (!stats) {
            stats = new PlayerStats(playerId);
            LudoCommand.playerStats.set(playerId, stats);
        }

        await sock.sendMessage(groupId, { text: stats.getStatsMessage() });
    }

    async sendAvailableBoards(sock, m) {
        const groupId = m.key.remoteJid;
        const boardList = Object.keys(this.customBoards).join(', ');
        const message = `📋 *Available Custom Boards*\n\n${boardList}\n\nUse !ludo start [board_name] to start a game with a custom board.`;
        await sock.sendMessage(groupId, { text: message });
    }

    updatePlayerStats(groupId, winner) {
        const game = LudoCommand.games.get(groupId);
        const gameResult = {
            winner: winner,
            moves: {},
            pawnsLost: {},
            pawnsFinished: {}
        };

        for (const player of game.players) {
            const playerStats = LudoCommand.playerStats.get(player) || new PlayerStats(player);
            gameResult.moves[player] = game.pawns[player].reduce((sum, pawn) => sum + (pawn.position === 'home' ? 57 : pawn.position + 1), 0);
            gameResult.pawnsLost[player] = game.pawns[player].filter(pawn => pawn.position === -1).length;
            gameResult.pawnsFinished[player] = game.pawns[player].filter(pawn => pawn.position === 'home').length;
            playerStats.updateStats(gameResult);
            LudoCommand.playerStats.set(player, playerStats);
        }
    }

    getPlayerEmoji(player) {
        const emojis = { red: '🔴', green: '🟢', yellow: '🟡', blue: '🔵' };
        return emojis[player] || '⚪';
    }
}


module.exports = {
    usage: ["ludo"],
    desc: "Play an advanced game of Ludo in the group chat with AI opponents, custom boards, and player statistics.",
    commandType: "Game",
    isGroupOnly: true,
    isAdminOnly: false,
    isPrivateOnly: false,
    emoji: '🎲',
    execute: async (sock, m) => {
        const ludoCommand = new LudoCommand();
        await ludoCommand.execute(sock, m);
    }
};
