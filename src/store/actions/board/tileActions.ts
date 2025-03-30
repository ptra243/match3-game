import { GameState, Color } from '../../types';
import { debugLog } from '../../slices/debug';

export const TileActions = {
  swapTiles: async (state: GameState, row1: number, col1: number, row2: number, col2: number) => {
    debugLog('BOARD_ACTION', 'Attempting tile swap', { row1, col1, row2, col2 });
    
    if (!state.wouldCreateMatch(row1, col1, row2, col2)) {
      debugLog('BOARD_ACTION', 'Invalid swap - no match would be created');
      return false;
    }

    state.updateTile(row1, col1, { ...state.board[row2][col2], isAnimating: true });
    state.updateTile(row2, col2, { ...state.board[row1][col1], isAnimating: true });

    await state.processNewBoard(state.board);
    state.switchPlayer();
    
    return true;
  },

  markTilesForDestruction: async (state: GameState, tiles: { row: number; col: number }[]) => {
    debugLog('BOARD_ACTION', 'Marking tiles for destruction', tiles);
    const destroyedTiles: { row: number; col: number; color: Color }[] = [];
    const animationIds: string[] = [];

    // Register explode animations
    for (const { row, col } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = state.registerAnimation('explode', [tileId], {
        row, col, color: state.board[row][col].color
      });
      animationIds.push(animId);
      destroyedTiles.push({ row, col, color: state.board[row][col].color });
    }

    // Update tile states
    tiles.forEach(({ row, col }) => {
      state.updateTile(row, col, {
        isMatched: true,
        isAnimating: true,
        isNew: false
      });
    });

    // Start animations
    animationIds.forEach(id => state.startAnimation(id));
    await state.waitForAllAnimations();

    return { destroyedTiles };
  },

  convertTiles: async (state: GameState, tiles: { row: number; col: number; color: Color }[]) => {
    debugLog('BOARD_ACTION', 'Converting tiles', tiles);

    // Register explode animations
    const destroyAnimIds: string[] = [];
    for (const { row, col } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = state.registerAnimation('explode', [tileId], {
        row, col, color: state.board[row][col].color
      });
      destroyAnimIds.push(animId);
    }

    // Update board with exploding tiles
    tiles.forEach(({ row, col }) => {
      state.updateTile(row, col, {
        isMatched: true,
        isAnimating: true
      });
    });

    // Start explosion animations
    destroyAnimIds.forEach(id => state.startAnimation(id));
    await state.waitForAllAnimations();

    // Set tiles to empty
    tiles.forEach(({ row, col }) => {
      state.updateTile(row, col, {
        color: 'empty' as Color,
        isMatched: false,
        isAnimating: true
      });
    });

    // Register fallIn animations
    const fallInAnimIds: string[] = [];
    for (const { row, col, color } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = state.registerAnimation('fallIn', [tileId], {
        row, col, color
      });
      fallInAnimIds.push(animId);
    }

    // Update board with new colors
    tiles.forEach(({ row, col, color }) => {
      state.updateTile(row, col, {
        color,
        isMatched: false,
        isAnimating: true
      });
    });

    // Start fallIn animations
    fallInAnimIds.forEach(id => state.startAnimation(id));
    await state.waitForAllAnimations();
  }
}; 