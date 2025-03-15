import { StateCreator } from 'zustand';
import { GameState, PlayerState, Player, Color, Tile } from '../types';
import { toast } from 'react-hot-toast';

export interface PlayerSlice {
  human: PlayerState;
  ai: PlayerState;
  currentPlayer: Player;
  selectedTile: { row: number; col: number } | null;
  selectTile: (row: number, col: number) => void;
  checkSkillReadiness: (player: Player) => void;
  toggleSkill: (player: Player) => void;
  useSkill: (row: number, col: number) => Promise<void>;
  switchPlayer: () => void;
  makeAiMove: () => Promise<void>;
}

const createInitialPlayerState = (isHuman: boolean = false): PlayerState => ({
  health: 100,
  matchedColors: {
    red: 0,
    green: 0,
    blue: 0,
    yellow: 0,
    black: 0,
    empty: 0,
  },
  skill: isHuman ? {
    name: "Cyclone",
    description: "Use 5 red gems to destroy a black tile and its surrounding tiles",
    isReady: false,
    isSelected: false,
    cost: 5,
    damage: 0,
    color: 'red',
    targetColor: 'black'
  } : {
    name: "Power Blast",
    description: "Deal 5 damage using 5 matched gems",
    isReady: false,
    isSelected: false,
    cost: 5,
    damage: 5
  }
});

export const createPlayerSlice: StateCreator<GameState, [], [], PlayerSlice> = (set, get) => ({
  human: createInitialPlayerState(true),
  ai: createInitialPlayerState(false),
  currentPlayer: 'human',
  selectedTile: null,

  selectTile: (row: number, col: number) => {
    set({ selectedTile: { row, col } });
  },

  checkSkillReadiness: (player: Player) => {
    const playerState = get()[player];
    const skill = playerState.skill;
    
    if (skill.color && playerState.matchedColors[skill.color] >= skill.cost) {
      set(state => ({
        [player]: {
          ...state[player],
          skill: {
            ...skill,
            isReady: true
          }
        }
      }));
      toast.success(`${player === 'human' ? 'Your' : 'AI\'s'} ${skill.name} is ready!`);
    }
  },

  toggleSkill: (player: Player) => {
    const playerState = get()[player];
    if (!playerState.skill.isReady) return;

    set(state => ({
      [player]: {
        ...state[player],
        skill: {
          ...state[player].skill,
          isSelected: !state[player].skill.isSelected
        }
      }
    }));
  },

  useSkill: async (row: number, col: number) => {
    const { currentPlayer, board } = get();
    const playerState = get()[currentPlayer];
    const skill = playerState.skill;

    if (!skill.isReady || !skill.isSelected) return;

    if (currentPlayer === 'human' && skill.name === 'Cyclone') {
      if (board[row][col].color !== 'black') {
        toast.error('Cyclone can only target black tiles!');
        return;
      }

      if (playerState.matchedColors.red < skill.cost) {
        toast.error('Not enough red gems!');
        return;
      }

      // Mark the target tile and surrounding tiles
      const surroundingTiles = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
        { row, col }
      ].filter(pos => 
        pos.row >= 0 && pos.row < board.length &&
        pos.col >= 0 && pos.col < board[0].length
      );

      const newBoard = board.map(row => [...row]);
      surroundingTiles.forEach(pos => {
        newBoard[pos.row][pos.col] = {
          ...newBoard[pos.row][pos.col],
          isMatched: true
        };
      });

      set(state => ({
        board: newBoard,
        [currentPlayer]: {
          ...state[currentPlayer],
          matchedColors: {
            ...state[currentPlayer].matchedColors,
            red: state[currentPlayer].matchedColors.red - skill.cost
          },
          skill: {
            ...state[currentPlayer].skill,
            isReady: false,
            isSelected: false
          }
        }
      }));

      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear matched tiles
      set(state => ({
        board: state.board.map(row =>
          row.map(tile =>
            tile.isMatched ? { ...tile, color: 'empty', isMatched: false } : tile
          )
        )
      }));

      // Drop tiles and fill empty spaces
      await new Promise(resolve => setTimeout(resolve, 300));
      get().dropTiles();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      get().fillEmptyTiles();

      // Switch turns after skill use
      get().switchPlayer();
    } else if (currentPlayer === 'ai' && skill.name === 'Power Blast') {
      // AI's Power Blast implementation
      const colors: Color[] = ['red', 'green', 'blue', 'yellow', 'black'];
      const matchedColor = colors.find(color => playerState.matchedColors[color] >= skill.cost);

      if (!matchedColor) {
        toast.error('AI doesn\'t have enough matched gems!');
        return;
      }

      set(state => ({
        [currentPlayer]: {
          ...state[currentPlayer],
          matchedColors: {
            ...state[currentPlayer].matchedColors,
            [matchedColor]: state[currentPlayer].matchedColors[matchedColor] - skill.cost
          },
          skill: {
            ...state[currentPlayer].skill,
            isReady: false,
            isSelected: false
          }
        },
        human: {
          ...state.human,
          health: state.human.health - skill.damage
        }
      }));

      toast.error(`AI used Power Blast! You took ${skill.damage} damage!`);
      
      // Switch turns after skill use
      get().switchPlayer();
    }
  },

  switchPlayer: () => {
    const currentPlayer = get().currentPlayer;
    const nextPlayer = currentPlayer === 'human' ? 'ai' : 'human';
    
    // Reset skill selection when switching turns
    set(state => ({
      currentPlayer: nextPlayer,
      human: {
        ...state.human,
        skill: {
          ...state.human.skill,
          isSelected: false
        }
      },
      ai: {
        ...state.ai,
        skill: {
          ...state.ai.skill,
          isSelected: false
        }
      },
      selectedTile: null
    }));

    if (nextPlayer === 'ai') {
      get().makeAiMove();
    }
  },

  makeAiMove: async () => {
    const { board, ai } = get();
    const BOARD_SIZE = board.length;

    // First, check if AI can use its skill
    if (ai.skill.isReady) {
      get().toggleSkill('ai');
      await get().useSkill(0, 0); // Position doesn't matter for AI's Power Blast
      return;
    }

    // Try to find a match
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        // Try horizontal swap
        if (get().wouldCreateMatch(row, col, row, col + 1)) {
          // Highlight the first tile
          get().selectTile(row, col);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Highlight the second tile
          get().selectTile(row, col + 1);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await get().swapTiles(row, col, row, col + 1);
          await get().checkMatches();
          return;
        }
      }
    }

    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 1; row++) {
        // Try vertical swap
        if (get().wouldCreateMatch(row, col, row + 1, col)) {
          // Highlight the first tile
          get().selectTile(row, col);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Highlight the second tile
          get().selectTile(row + 1, col);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await get().swapTiles(row, col, row + 1, col);
          await get().checkMatches();
          return;
        }
      }
    }

    // If no matches found, switch back to human
    toast.error("AI couldn't find a move!");
    get().switchPlayer();
  },
}); 