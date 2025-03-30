import { GameState, Color, Tile } from '../../types';
import { debugLog } from '../../slices/debug';
import { GAME_CONSTANTS, GAME_FLOW } from '../../gameRules';

// Private helper functions
const createEmptyBoard = (): Tile[][] => {
  return Array(GAME_CONSTANTS.BOARD_SIZE).fill(null).map(() =>
    Array(GAME_CONSTANTS.BOARD_SIZE).fill(null).map(() => ({
      color: 'empty' as Color,
      isMatched: false,
      isNew: true,
      isAnimating: true,
      isFrozen: false,
      isIgnited: false
    }))
  );
};

const getAvailableColors = (board: Tile[][], row: number, col: number): Color[] => {
  return GAME_CONSTANTS.AVAILABLE_COLORS.filter((color: Color) => {
    if (col >= 2) {
      if (board[row][col - 1].color === color &&
        board[row][col - 2].color === color) {
        return false;
      }
    }

    if (row >= 2) {
      if (board[row - 1][col].color === color &&
        board[row - 2][col].color === color) {
        return false;
      }
    }

    return true;
  });
};

const selectColor = (availableColors: Color[]): Color => {
  return availableColors.length > 0
    ? availableColors[Math.floor(Math.random() * availableColors.length)]
    : GAME_CONSTANTS.AVAILABLE_COLORS[Math.floor(Math.random() * GAME_CONSTANTS.AVAILABLE_COLORS.length)];
};

const fillBoardWithColors = (board: Tile[][]): Tile[][] => {
  for (let row = 0; row < GAME_CONSTANTS.BOARD_SIZE; row++) {
    for (let col = 0; col < GAME_CONSTANTS.BOARD_SIZE; col++) {
      const availableColors = getAvailableColors(board, row, col);
      const color = selectColor(availableColors);
      board[row][col] = {
        ...board[row][col],
        color: color as Color
      };
    }
  }
  return board;
};

// Private drop tiles helpers
const findSourceRow = (
  state: GameState,
  row: number,
  col: number,
  droppedTiles: Set<string>
): number => {
  let sourceRow = row - 1;
  while (sourceRow >= 0 &&
    (state.board[sourceRow][col].color === 'empty' ||
      state.board[sourceRow][col].isFrozen ||
      droppedTiles.has(`${sourceRow},${col}`))) {
    sourceRow--;
  }
  return sourceRow;
};

const findDrops = (state: GameState): Array<{
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  color: Color;
  animId: string;
}> => {
  const drops: Array<{
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    color: Color;
    animId: string;
  }> = [];
  const droppedTiles = new Set<string>();

  for (let col = 0; col < GAME_CONSTANTS.BOARD_SIZE; col++) {
    for (let row = GAME_CONSTANTS.BOARD_SIZE - 1; row >= 0; row--) {
      if (state.board[row][col].isFrozen) continue;

      if (state.board[row][col].color === 'empty' || droppedTiles.has(`${row},${col}`)) {
        const sourceRow = findSourceRow(state, row, col, droppedTiles);
        
        if (sourceRow >= 0) {
          const sourceColor = state.board[sourceRow][col].color;
          const tileId = `tile-${row}-${col}`;
          const animId = state.registerAnimation('fallIn', [tileId], {
            fromRow: sourceRow,
            toRow: row,
            col: col,
            color: sourceColor
          });

          drops.push({
            fromRow: sourceRow,
            fromCol: col,
            toRow: row,
            toCol: col,
            color: sourceColor,
            animId
          });

          droppedTiles.add(`${sourceRow},${col}`);
        }
      }
    }
  }

  return drops;
};

const executeDrops = async (
  state: GameState,
  drops: Array<{
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    color: Color;
    animId: string;
  }>
) => {
  drops.forEach(drop => {
    state.updateTile(drop.toRow, drop.toCol, {
      ...state.board[drop.fromRow][drop.fromCol],
      isAnimating: true,
      isNew: false
    });
    state.updateTile(drop.fromRow, drop.fromCol, {
      color: 'empty',
      isMatched: false,
      isNew: false,
      isAnimating: false,
      isFrozen: false,
      isIgnited: false
    });
    state.startAnimation(drop.animId);
  });
};

// Private fill empty tiles helpers
const findEmptyPositions = (state: GameState): {
  emptyPositions: Array<{ row: number; col: number; color: Color }>;
  animationIds: string[];
} => {
  const emptyPositions: Array<{ row: number; col: number; color: Color }> = [];
  const animationIds: string[] = [];

  for (let row = 0; row < GAME_CONSTANTS.BOARD_SIZE; row++) {
    for (let col = 0; col < GAME_CONSTANTS.BOARD_SIZE; col++) {
      if (state.board[row][col].color === 'empty') {
        const colors: Color[] = ['red', 'green', 'blue', 'yellow', 'black'];
        const newColor = colors[Math.floor(Math.random() * colors.length)];
        
        emptyPositions.push({ row, col, color: newColor });
        const tileId = `tile-${row}-${col}`;
        
        const animId = state.registerAnimation('fallIn', [tileId], {
          row,
          col,
          color: newColor
        });
        animationIds.push(animId);
      }
    }
  }

  return { emptyPositions, animationIds };
};

const executeFill = async (
  state: GameState,
  emptyPositions: Array<{ row: number; col: number; color: Color }>,
  animationIds: string[]
) => {
  emptyPositions.forEach(({ row, col, color }) => {
    state.updateTile(row, col, {
      color,
      isMatched: false,
      isNew: true,
      isAnimating: true,
      isFrozen: false,
      isIgnited: false
    });
  });

  animationIds.forEach(animId => state.startAnimation(animId));
};

// Public API
export const BoardActions = {
  initializeBoard: (state: GameState) => {
    debugLog('BOARD_ACTION', 'Initializing board');
    const initialBoard = createEmptyBoard();
    const filledBoard = fillBoardWithColors(initialBoard);
    state.setBoard(filledBoard);
  },

  dropTiles: async (state: GameState) => {
    debugLog('BOARD_ACTION', 'Starting tile drop');
    const drops = findDrops(state);
    
    if (drops.length > 0) {
      await executeDrops(state, drops);
    }

    return state.board;
  },

  fillEmptyTiles: async (state: GameState) => {
    debugLog('BOARD_ACTION', 'Filling empty tiles');
    const { emptyPositions, animationIds } = findEmptyPositions(state);
    
    if (emptyPositions.length > 0) {
      await executeFill(state, emptyPositions, animationIds);
    }

    return state.board;
  }
}; 