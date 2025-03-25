import {StateCreator} from 'zustand';
import {Color, GameState, Tile} from '../types';
import {toast} from 'react-hot-toast';
import {CLASSES} from '../classes';
import {EXTRA_TURN_CONDITIONS} from '../gameRules';
import {ALL_ITEMS} from '../items';

// Import debug configuration
import {debugLog} from '../slices/debug';
import {TileHelpers} from "../skills/effects/TileHelpers.ts";

interface Match {
    color: Color;
    tiles: { row: number; col: number }[];
    isSpecialShape?: 'T' | 'L';
    length?: number;
}

export interface MatchSlice {
    currentMatchSequence: number;
    currentCombo: number;
    processMatches: () => Promise<boolean>;
    findMatches: (board: Tile[][]) => Match[];
    hasValidMoves: () => boolean;
    wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;
}

class UnionFind {
    private parent: Map<string, string>;
    private sets: Map<string, { color: Color; tiles: { row: number; col: number }[] }>;

    constructor() {
        this.parent = new Map();
        this.sets = new Map();
    }

    makeSet(tile: { row: number; col: number }, color: Color) {
        const key = `${tile.row},${tile.col}`;
        if (!this.parent.has(key)) {
            this.parent.set(key, key);
            this.sets.set(key, {color, tiles: [tile]});
        }
    }

    find(tile: { row: number; col: number }): string {
        const key = `${tile.row},${tile.col}`;
        if (!this.parent.has(key)) return key;

        let root = this.parent.get(key)!;
        if (root !== key) {
            root = this.find({row: parseInt(root.split(',')[0]), col: parseInt(root.split(',')[1])});
            this.parent.set(key, root); // Path compression
        }
        return root;
    }

    union(tile1: { row: number; col: number }, tile2: { row: number; col: number }) {
        const root1 = this.find(tile1);
        const root2 = this.find(tile2);

        if (root1 !== root2) {
            this.parent.set(root2, root1);
            const set1 = this.sets.get(root1)!;
            const set2 = this.sets.get(root2)!;

            // Merge sets
            const allTiles = [...set1.tiles, ...set2.tiles];
            const distinctTiles = allTiles.filter((tile, index, self) =>
                index === self.findIndex(t => t.row === tile.row && t.col === tile.col)
            );

            this.sets.set(root1, {
                color: set1.color,
                tiles: distinctTiles
            });
            this.sets.delete(root2);
        }
    }

    getSets(): Match[] {
        const uniqueSets = new Set<string>();
        const matches: Match[] = [];

        for (const [key, value] of this.sets.entries()) {
            const root = this.find({row: parseInt(key.split(',')[0]), col: parseInt(key.split(',')[1])});
            if (!uniqueSets.has(root)) {
                uniqueSets.add(root);
                const set = this.sets.get(root)!;
                if (set.tiles.length >= 3) {
                    matches.push({
                        color: set.color,
                        tiles: set.tiles,
                        length: set.tiles.length
                    });
                }
            }
        }

        return matches;
    }
}

export const createMatchSlice: StateCreator<GameState, [], [], MatchSlice> = (set, get) => ({
    currentMatchSequence: 0,
    currentCombo: 0,

    findMatches: (board: Tile[][]): Match[] => {
        const BOARD_SIZE = board.length;
        const unionFind = new UnionFind();
        const horizontalVisited = new Set<string>();
        const verticalVisited = new Set<string>();

        // Helper to check/mark visited tiles
        const getTileKey = (row: number, col: number) => `${row},${col}`;
        const isHorizontallyVisited = (row: number, col: number) => horizontalVisited.has(getTileKey(row, col));
        const markHorizontallyVisited = (row: number, col: number) => horizontalVisited.add(getTileKey(row, col));
        const isVerticallyVisited = (row: number, col: number) => verticalVisited.has(getTileKey(row, col));
        const markVerticallyVisited = (row: number, col: number) => verticalVisited.add(getTileKey(row, col));

        // Process the board in a single pass
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col].color === 'empty') continue;

                const color = board[row][col].color;

                // Check for horizontal match starting from this tile
                if (col < BOARD_SIZE - 2 && !isHorizontallyVisited(row, col)) { // Need at least 3 tiles horizontally
                    let hLength = 1;
                    while (col + hLength < BOARD_SIZE && board[row][col + hLength].color === color) {
                        hLength++;
                    }

                    // If we found a valid horizontal match (3+ tiles)
                    if (hLength >= 3) {
                        const currentTile = {row, col};

                        // Create a set for this horizontal match
                        unionFind.makeSet(currentTile, color);
                        markHorizontallyVisited(row, col);

                        // Add all tiles in this horizontal match to the set
                        for (let i = 1; i < hLength; i++) {
                            const nextTile = {row, col: col + i};
                            unionFind.makeSet(nextTile, color);
                            unionFind.union(currentTile, nextTile);
                            markHorizontallyVisited(row, col + i);
                        }
                    }
                }

                // Check for vertical match starting from this tile
                if (row < BOARD_SIZE - 2 && !isVerticallyVisited(row, col)) { // Need at least 3 tiles vertically
                    let vLength = 1;
                    while (row + vLength < BOARD_SIZE && board[row + vLength][col].color === color) {
                        vLength++;
                    }

                    // If we found a valid vertical match (3+ tiles)
                    if (vLength >= 3) {
                        const currentTile = {row, col};

                        // Create a set for this vertical match
                        unionFind.makeSet(currentTile, color);
                        markVerticallyVisited(row, col);

                        // Add all tiles in this vertical match to the set
                        for (let i = 1; i < vLength; i++) {
                            const nextTile = {row: row + i, col};
                            unionFind.makeSet(nextTile, color);
                            unionFind.union(currentTile, nextTile);
                            markVerticallyVisited(row + i, col);
                        }
                    }
                }
            }
        }

        // Get all the matches
        const matches = unionFind.getSets();

        // Identify special shapes within the matches
        return matches.map(match => {
            if (match.tiles.length !== 5) return match; // Special shapes have exactly 5 tiles

            // Check for T shape
            const rowCounts = new Map<number, number>();
            const colCounts = new Map<number, number>();

            match.tiles.forEach(tile => {
                rowCounts.set(tile.row, (rowCounts.get(tile.row) || 0) + 1);
                colCounts.set(tile.col, (colCounts.get(tile.col) || 0) + 1);
            });

            // T shape: one row has 3 tiles, another two rows have 1 tile each in the same column
            let isTShape = false;
            let isLShape = false;

            // Check for horizontal bar with vertical extension (T shape)
            const rowWith3 = Array.from(rowCounts.entries()).find(([_, count]) => count === 3);
            if (rowWith3) {
                const [rowIndex] = rowWith3;
                const colsInRow3 = match.tiles
                    .filter(t => t.row === rowIndex)
                    .map(t => t.col)
                    .sort((a, b) => a - b);

                // Check if it's a contiguous row
                if (colsInRow3[2] - colsInRow3[0] === 2) {
                    // Check for the vertical part (2 tiles)
                    const middleCol = colsInRow3[1];
                    const verticalTiles = match.tiles.filter(t => t.col === middleCol && t.row !== rowIndex);

                    if (verticalTiles.length === 2 &&
                        Math.abs(verticalTiles[0].row - verticalTiles[1].row) === 1) {
                        isTShape = true;
                    }
                }
            }

            // Check for vertical bar with horizontal extension (L shape)
            const colWith3 = Array.from(colCounts.entries()).find(([_, count]) => count === 3);
            if (colWith3 && !isTShape) {
                const [colIndex] = colWith3;
                const rowsInCol3 = match.tiles
                    .filter(t => t.col === colIndex)
                    .map(t => t.row)
                    .sort((a, b) => a - b);

                // Check if it's a contiguous column
                if (rowsInCol3[2] - rowsInCol3[0] === 2) {
                    // Bottom row of the vertical part
                    const bottomRow = rowsInCol3[2];

                    // Check for the horizontal part (2 tiles extending right from bottom)
                    const horizontalTiles = match.tiles.filter(t =>
                        t.row === bottomRow && t.col !== colIndex
                    );

                    if (horizontalTiles.length === 2 &&
                        horizontalTiles.every(t => t.col > colIndex) &&
                        horizontalTiles.sort((a, b) => a.col - b.col)[1].col - horizontalTiles[0].col === 1) {
                        isLShape = true;
                    }
                }
            }

            // Return the match with shape information
            if (isTShape) {
                return {...match, isSpecialShape: 'T' as const};
            } else if (isLShape) {
                return {...match, isSpecialShape: 'L' as const};
            }

            return match;
        });
    },

    processMatches: async () => {
        const {board, currentPlayer} = get();

        debugLog('MATCH_SLICE', 'Processing matches');

        // Find all matches on the board
        const matches = get().findMatches(board);
        const hasMatches = matches.length > 0;

        if (hasMatches) {
            debugLog('MATCH_SLICE', 'Found matches', matches);

            // Increment combo counter for cascades
            get().incrementCombo();

            // Collect all matched tiles
            const matchedTilesSet = new Set<string>();
            const matched: { row: number; col: number; color: Color }[] = [];
            const matchedColors: Record<Color, number> = {
                red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0
            };

            // Process all matches
            let hasSpecialMatch = false;


            const ignitedTiles: { row: number, col: number }[] = [];
            // Process ignited tiles and chain explosions
            const processedTiles = new Set<string>();
            const allExplodedTiles: { row: number; col: number }[] = [];

            const processIgnitedTile = (tile: { row: number, col: number }) => {
                // Generate exploded tiles for the ignited tile
                const explodedTiles = TileHelpers.selectPattern(board, tile.row, tile.col, 'square', 3);

                // Add them to the allExplodedTiles list
                explodedTiles.forEach(({row, col}) => {
                    const key = `${row},${col}`;
                    if (!matchedTilesSet.has(key)) {
                        matchedTilesSet.add(key);
                        matched.push({...board[row][col], row, col, color: board[row][col].color});
                    }
                    if (!processedTiles.has(key)) {
                        processedTiles.add(key);
                        allExplodedTiles.push({row, col});

                        // Check if this tile is ignited and hasn't been processed
                        if (board[row][col].isIgnited && !ignitedTiles.some(t => t.row === row && t.col === col)) {
                            // Add the newly ignited tile to the ignitedTiles list for further processing
                            ignitedTiles.push({row, col});
                        }
                    }
                });
            };

            // Process each ignited tile
            while (ignitedTiles.length > 0) {
                const currentTile = ignitedTiles.shift();
                if (currentTile) {
                    processIgnitedTile(currentTile);
                }
            }

            matches.forEach(match => {
                match.tiles.forEach(tile => {
                    const key = `${tile.row},${tile.col}`;
                    if (!matchedTilesSet.has(key)) {
                        matchedTilesSet.add(key);
                        matched.push({...tile, color: match.color});
                        matchedColors[match.color] = (matchedColors[match.color] || 0) + 1;

                        // Check if this tile is ignited
                        if (board[tile.row][tile.col].isIgnited) {
                            ignitedTiles.push(tile);
                        }
                    }
                });

                if (match.isSpecialShape) {
                    hasSpecialMatch = true;
                    // Grant an extra turn if this is a special match and the condition is met
                    if (EXTRA_TURN_CONDITIONS.SPECIAL_SHAPES.includes(match.isSpecialShape as 'T' | 'L')) {
                        get().setExtraTurn(true);
                        toast.success('Special match! Extra turn granted!');
                        debugLog('MATCH_SLICE', 'Special match!', match);
                    }
                }

                // Check for extra turn based on match length
                if (match.length && EXTRA_TURN_CONDITIONS.MATCH_LENGTHS.some(len => len === match.length)) {
                    get().setExtraTurn(true);
                    toast.success(`${match.length}-tile match! Extra turn granted!`);
                }
            });

            // Increment the match sequence counter
            get().incrementMatchSequence();

            // Mark all matched tiles on the board
            await get().markTilesAsMatched(matched);
            // Calculate and apply damage
            const opponent = currentPlayer === 'human' ? 'ai' : 'human';
            let totalDamage = 0;

            // Calculate damage based on player's color stats
            const calculateMatchDamage = (match: Match) => {
                const color = match.color;
                const colorStat = get()[currentPlayer].colorStats[color] || 0;
                const matchLength = match.tiles.length;

                // Base damage = colorStat × (number of tiles ÷ 3, rounded up)
                // This makes damage more balanced, requiring 3 tiles per colorStat damage
                let baseDamage = colorStat * Math.ceil(matchLength / 3);

                // Length multiplier for 4 and 5-tile matches
                if (matchLength === 4) {
                    baseDamage *= 1.5; // 1.5x multiplier for 4-tile matches
                } else if (matchLength >= 5) {
                    baseDamage *= 2; // 2x multiplier for 5-tile matches
                }

                // Special shape multiplier (1.5x for special shapes)
                if (match.isSpecialShape) {
                    baseDamage *= 1.5;
                }

                // Combo multiplier
                const comboCount = get().currentCombo;
                if (comboCount > 1) {
                    baseDamage *= (1 + (comboCount - 1) * 0.5); // Combo multiplier increment
                }

                return Math.round(baseDamage);
            };

            // Calculate damage for each match
            matches.forEach(match => {
                const damage = calculateMatchDamage(match);
                debugLog('MATCH_SLICE', 'Calculated damage for match', {
                    match,
                    colorStat: get()[currentPlayer].colorStats[match.color],
                    damage
                });
                totalDamage += damage;

                // Trigger onMatch effects for items
                const player = get()[currentPlayer];
                Object.values(player.equippedItems).forEach(item => {
                    if (item) {
                        item.effects.forEach(effect => {
                            if (effect.onMatch) {
                                effect.onMatch(get(), match.color);
                            }
                        });
                    }
                });
            });

            // Apply damage using the new takeDamage function
            // Match damage is direct damage
            if (totalDamage > 0) {
                get().takeDamage(currentPlayer, opponent, totalDamage, true);
            }

            // Add matched resources to the current player
            const resourceMultiplier = get()[currentPlayer].statusEffects.reduce(
                (multiplier, effect) => multiplier * (effect.resourceMultiplier || 1), 1
            );

            // Apply resource conversion effect if present
            const conversionEffect = get()[currentPlayer].statusEffects.find(effect => effect.manaConversion);

            // Update player's matched colors (resources)
            set(state => {
                const updatedMatchedColors = {...state[currentPlayer].matchedColors};

                // Process each matched color
                Object.entries(matchedColors).forEach(([color, count]) => {
                    if (color === 'empty') return;

                    let resourceColor = color as Color;
                    let resourceCount = Math.round(count * resourceMultiplier);

                    // Apply conversion if applicable
                    if (conversionEffect?.manaConversion && conversionEffect.manaConversion.from === color) {
                        resourceColor = conversionEffect.manaConversion.to as Color;
                    }

                    updatedMatchedColors[resourceColor] = (updatedMatchedColors[resourceColor] || 0) + resourceCount;
                });

                return {
                    [currentPlayer]: {
                        ...state[currentPlayer],
                        matchedColors: updatedMatchedColors
                    }
                };
            });

            // Emit match event
            if (get().emit) {
                get().emit('OnMatch', {
                    tiles: matched,
                    colors: matchedColors,
                    player: currentPlayer,
                    isSpecialShape: hasSpecialMatch
                });
            }

            // Check if we should offer an item reward
            const checkOfferItemReward = () => {
                const currentPlayer = get().currentPlayer;

                // Only offer rewards to human player, not AI
                if (currentPlayer === 'ai') return;

                // Offer reward with 15% chance after a match
                if (Math.random() > 0.15) return;

                // Get colors not used by either player as primary or secondary
                const humanClass = CLASSES[get().human.className];
                const aiClass = CLASSES[get().ai.className];
                const usedColors = [
                    humanClass.primaryColor,
                    humanClass.secondaryColor,
                    aiClass.primaryColor,
                    aiClass.secondaryColor
                ];

                const availableColors = ['red', 'blue', 'green', 'yellow', 'black'].filter(
                    color => !usedColors.includes(color as Color)
                ) as Color[];

                // If no colors available, use a random color
                const costColor = availableColors.length > 0
                    ? availableColors[Math.floor(Math.random() * availableColors.length)]
                    : ['red', 'blue', 'green', 'yellow', 'black'][Math.floor(Math.random() * 5)] as Color;

                // Set cost based on match sequence or combo
                const costAmount = Math.max(3, Math.min(8, get().currentCombo * 2));

                // Generate reward options - one of each rarity
                const commonItems = Object.values(ALL_ITEMS).filter(item => item.rarity === 'common');
                const uncommonItems = Object.values(ALL_ITEMS).filter(item => item.rarity === 'uncommon');
                const rareItems = Object.values(ALL_ITEMS).filter(item => item.rarity === 'rare');

                // Randomly select one item from each rarity
                const options = [
                    commonItems[Math.floor(Math.random() * commonItems.length)],
                    uncommonItems[Math.floor(Math.random() * uncommonItems.length)],
                    rareItems[Math.floor(Math.random() * rareItems.length)]
                ].map(item => item.id);

                // Offer the reward
                get().setItemReward(options, {color: costColor, amount: costAmount});
            };

            checkOfferItemReward();

            const deadTiles = matched.map(tile => ({row: tile.row, col: tile.col}));
            debugLog('MATCH_SLICE', 'Matches processed, calculating fall-in', {
                deadTiles: deadTiles.length
            });
        }

        return hasMatches;
    },

    hasValidMoves: () => {
        const board = get().board;
        const BOARD_SIZE = board.length;

        // Check horizontal swaps
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE - 1; col++) {
                // Create a temporary board with the swap applied
                const tempBoard = board.map(row => [...row]);
                const temp = {...tempBoard[row][col]};
                tempBoard[row][col] = {...tempBoard[row][col + 1]};
                tempBoard[row][col + 1] = temp;

                // Check if this swap creates a match
                if (get().findMatches(tempBoard).length > 0) {
                    return true;
                }
            }
        }

        // Check vertical swaps
        for (let col = 0; col < BOARD_SIZE; col++) {
            for (let row = 0; row < BOARD_SIZE - 1; row++) {
                // Create a temporary board with the swap applied
                const tempBoard = board.map(row => [...row]);
                const temp = {...tempBoard[row][col]};
                tempBoard[row][col] = {...tempBoard[row + 1][col]};
                tempBoard[row + 1][col] = temp;

                // Check if this swap creates a match
                if (get().findMatches(tempBoard).length > 0) {
                    return true;
                }
            }
        }

        return false;
    },

    wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number): boolean => {
        debugLog('BOARD_SLICE', 'Checking potential match', {row1, col1, row2, col2});
        const board = get().board;
        const tempBoard = board.map(row => [...row]);
        const temp = {...tempBoard[row1][col1]};
        tempBoard[row1][col1] = {...tempBoard[row2][col2]};
        tempBoard[row2][col2] = {...temp};
        const hasMatch = get().findMatches(tempBoard).length > 0;
        debugLog('BOARD_SLICE', 'Match check result', {hasMatch});
        return hasMatch;
    },

}); 