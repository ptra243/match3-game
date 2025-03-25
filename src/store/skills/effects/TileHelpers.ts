// Tile selection helper functions
import {Color, Tile} from "../../types.ts";
import {TilePosition} from "./effects.ts";

export const TileHelpers = {
    /**
     * Select tiles in a specific pattern around a center point
     * @param board the board where the tiles are
     * @param centerRow Center row for the pattern
     * @param centerCol Center column for the pattern
     * @param pattern Pattern shape to select tiles in
     * @param radius How far from the center to include tiles
     * @returns Array of objects containing tile coordinates and the tile itself
     */
    selectPattern(
        board: Tile[][],
        centerRow: number,
        centerCol: number,
        pattern: 'diamond' | 'square' | 'cross' = 'diamond',
        radius: number = 2
    ): TilePosition[] {
        if (centerRow === undefined || centerCol === undefined) return [];

        const tilePositions: TilePosition[] = [];
        const boardHeight = board.length;
        const boardWidth = board[0].length;

        for (let r = 0; r < boardHeight; r++) {
            for (let c = 0; c < boardWidth; c++) {
                let shouldInclude = false;

                if (pattern === 'diamond') {
                    const distance = Math.abs(r - centerRow) + Math.abs(c - centerCol);
                    shouldInclude = distance <= radius;
                } else if (pattern === 'square') {
                    const rowDist = Math.abs(r - centerRow);
                    const colDist = Math.abs(c - centerCol);
                    shouldInclude = rowDist <= radius && colDist <= radius;
                } else if (pattern === 'cross') {
                    shouldInclude = r === centerRow || c === centerCol;
                    const distance = Math.abs(r - centerRow) + Math.abs(c - centerCol);
                    shouldInclude = shouldInclude && distance <= radius;
                }

                if (shouldInclude) {
                    tilePositions.push({
                        row: r,
                        col: c,
                        tile: board[r][c]
                    });
                }
            }
        }

        return tilePositions;
    },

    /**
     * Select random tiles from the board with filtering options
     * @param state Game state to read the board from
     * @param count Maximum number of tiles to select
     * @param options Selection options for filtering
     * @returns Array of objects containing tile coordinates and the tile itself
     */
    selectRandom(
        board: Tile[][],
        count: number,
        options: {
            colors?: Color[];       // Only select tiles of these colors
            excludeColors?: Color[]; // Exclude tiles of these colors
            excludeFrozen?: boolean; // Exclude frozen tiles
            excludeIgnited?: boolean; // Exclude ignited tiles
            onlyEmpty?: boolean;    // Only include empty tiles
            excludeEmpty?: boolean; // Exclude empty tiles
        } = {}
    ): TilePosition[] {
        const availableTilePositions: TilePosition[] = [];
        const boardHeight = board.length;
        const boardWidth = board[0].length;

        // Build list of available tiles based on options
        for (let row = 0; row < boardHeight; row++) {
            for (let col = 0; col < boardWidth; col++) {
                const tile = board[row][col];
                let isValid = true;

                // Color filtering
                if (options.colors && options.colors.length > 0) {
                    isValid = isValid && options.colors.includes(tile.color);
                }

                if (options.excludeColors && options.excludeColors.length > 0) {
                    isValid = isValid && !options.excludeColors.includes(tile.color);
                }

                // State filtering
                if (options.excludeFrozen) {
                    isValid = isValid && !tile.isFrozen;
                }

                if (options.excludeIgnited) {
                    isValid = isValid && !tile.isIgnited;
                }

                // Empty tile filtering
                if (options.onlyEmpty) {
                    isValid = isValid && tile.color === 'empty';
                }

                if (options.excludeEmpty) {
                    isValid = isValid && tile.color !== 'empty';
                }

                if (isValid) {
                    availableTilePositions.push({
                        row,
                        col,
                        tile
                    });
                }
            }
        }

        // Shuffle the tiles using Fisher-Yates algorithm
        for (let i = availableTilePositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableTilePositions[i], availableTilePositions[j]] = [availableTilePositions[j], availableTilePositions[i]];
        }

        // Return requested number of tiles (or all if count > available)
        return availableTilePositions.slice(0, count);
    }
};