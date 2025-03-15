import { StateCreator } from 'zustand';
import { GameState, PlayerState, Player, Color, Tile } from '../types';
import { toast } from 'react-hot-toast';
import { CLASSES } from '../classes';

export interface PlayerSlice {
  human: PlayerState;
  ai: PlayerState;
  currentPlayer: Player;
  selectedTile: { row: number; col: number } | null;
  selectTile: (row: number, col: number) => void;
  checkSkillReadiness: (player: Player) => void;
  toggleSkill: (player: Player, skillIndex: number) => void;
  useSkill: (row: number, col: number) => Promise<void>;
  switchPlayer: () => void;
  makeAiMove: () => Promise<void>;
  selectClass: (player: Player, className: string) => void;
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
  className: isHuman ? 'pyromancer' : 'shadowPriest',
  activeSkillIndex: null,
  statusEffects: [],
  skillCastCount: {}
});

export const createPlayerSlice: StateCreator<GameState, [], [], PlayerSlice> = (set, get) => ({
  human: createInitialPlayerState(true),
  ai: createInitialPlayerState(false),
  currentPlayer: 'human',
  selectedTile: null,

  selectTile: (row: number, col: number) => {
    set({ selectedTile: { row, col } });
  },

  selectClass: (player: Player, className: string) => {
    if (!CLASSES[className]) return;
    set(state => ({
      [player]: {
        ...state[player],
        className,
        activeSkillIndex: null,
        statusEffects: []
      }
    }));
  },

  checkSkillReadiness: (player: Player) => {
    const playerState = get()[player];
    const characterClass = CLASSES[playerState.className];
    
    characterClass.skills.forEach((skill, index) => {
      let isReady = true;
      // Check if player has enough resources for the skill
      Object.entries(skill.cost).forEach(([color, cost]) => {
        if (playerState.matchedColors[color as Color] < cost) {
          isReady = false;
        }
      });

      if (isReady) {
        const skillName = characterClass.skills[index].name;
        toast.success(`${player === 'human' ? 'Your' : 'AI\'s'} ${skillName} is ready!`);
      }
    });
  },

  toggleSkill: (player: Player, skillIndex: number) => {
    const playerState = get()[player];
    const characterClass = CLASSES[playerState.className];
    const skill = characterClass.skills[skillIndex];
    
    if (!skill) return;

    // Check if player has enough resources
    let canUseSkill = true;
    Object.entries(skill.cost).forEach(([color, cost]) => {
      if (playerState.matchedColors[color as Color] < cost) {
        canUseSkill = false;
      }
    });

    if (!canUseSkill) {
      toast.error('Not enough resources for this skill!');
      return;
    }

    set(state => ({
      [player]: {
        ...state[player],
        activeSkillIndex: state[player].activeSkillIndex === skillIndex ? null : skillIndex
      }
    }));
  },

  useSkill: async (row: number, col: number) => {
    const state = get();
    const { currentPlayer, board } = state;
    const playerState = state[currentPlayer];
    const characterClass = CLASSES[playerState.className];
    const activeSkill = playerState.activeSkillIndex !== null 
      ? characterClass.skills[playerState.activeSkillIndex]
      : null;

    if (!activeSkill) return;

    // Check target color if skill requires specific target
    if (activeSkill.targetColor && board[row][col].color !== activeSkill.targetColor) {
      toast.error(`This skill can only target ${activeSkill.targetColor} tiles!`);
      return;
    }

    // Consume resources
    const newMatchedColors = { ...playerState.matchedColors };
    Object.entries(activeSkill.cost).forEach(([color, cost]) => {
      newMatchedColors[color as Color] -= cost;
    });

    // Apply skill effect
    await activeSkill.effect(state, row, col);

    // Update player state
    set(state => ({
      [currentPlayer]: {
        ...state[currentPlayer],
        matchedColors: newMatchedColors,
        activeSkillIndex: null
      }
    }));

    // Switch turns after skill use
    get().switchPlayer();
  },

  switchPlayer: () => {
    const currentPlayer = get().currentPlayer;
    const nextPlayer = currentPlayer === 'human' ? 'ai' : 'human';
    
    // Update status effects
    const updateStatusEffects = (player: Player) => {
      const playerState = get()[player];
      const newStatusEffects = playerState.statusEffects
        .map(effect => ({
          ...effect,
          turnsRemaining: effect.turnsRemaining - 1
        }))
        .filter(effect => effect.turnsRemaining > 0);

      set(state => ({
        [player]: {
          ...state[player],
          statusEffects: newStatusEffects
        }
      }));

      // Check for extra turn effect
      return newStatusEffects.some(effect => effect.extraTurn);
    };

    const humanHasExtraTurn = updateStatusEffects('human');
    const aiHasExtraTurn = updateStatusEffects('ai');
    
    // Only switch players if the current player doesn't have an extra turn
    const shouldSwitchPlayer = currentPlayer === 'human' 
      ? !humanHasExtraTurn 
      : !aiHasExtraTurn;

    if (shouldSwitchPlayer) {
      set(state => ({
        currentPlayer: nextPlayer,
        selectedTile: null  // Only clear selection when switching players
      }));

      if (nextPlayer === 'ai') {
        get().makeAiMove();
      }
    } else {
      toast.success(`${currentPlayer === 'human' ? 'You get' : 'AI gets'} an extra turn!`);
    }
  },

  makeAiMove: async () => {
    const { board, ai } = get();
    const BOARD_SIZE = board.length;
    const characterClass = CLASSES[ai.className];

    // First, check if AI can use any skills
    const availableSkills = characterClass.skills.map((skill, index) => ({
      skill,
      index
    })).filter(({ skill }) => {
      let canUse = true;
      Object.entries(skill.cost).forEach(([color, cost]) => {
        if (ai.matchedColors[color as Color] < cost) {
          canUse = false;
        }
      });
      return canUse;
    });

    if (availableSkills.length > 0) {
      // For now, just use the first available skill
      const { skill, index } = availableSkills[0];
      get().toggleSkill('ai', index);
      
      // Find appropriate target for the skill
      if (skill.targetColor) {
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col].color === skill.targetColor) {
              await get().useSkill(row, col);
              return;
            }
          }
        }
      } else {
        // If no specific target needed, just use at 0,0
        await get().useSkill(0, 0);
        return;
      }
    }

    // Try to find a match
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        if (get().wouldCreateMatch(row, col, row, col + 1)) {
          // Visual feedback for AI's move
          get().selectTile(row, col);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          get().selectTile(row, col + 1);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Clear selection before swap
          set({ selectedTile: null });
          
          // Execute the move
          const swapped = await get().swapTiles(row, col, row, col + 1);
          if (swapped) {
            return;
          }
        }
      }
    }

    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 1; row++) {
        if (get().wouldCreateMatch(row, col, row + 1, col)) {
          // Visual feedback for AI's move
          get().selectTile(row, col);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          get().selectTile(row + 1, col);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Clear selection before swap
          set({ selectedTile: null });
          
          // Execute the move
          const swapped = await get().swapTiles(row, col, row + 1, col);
          if (swapped) {
            return;
          }
        }
      }
    }

    toast.error("AI couldn't find a move!");
    get().switchPlayer();
  },
}); 