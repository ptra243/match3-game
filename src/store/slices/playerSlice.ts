import { StateCreator } from 'zustand';
import { GameState, PlayerState, Player, Color, Tile } from '../types';
import { toast } from 'react-hot-toast';
import { CLASSES } from '../classes';
import { ALL_SKILLS, ClassSkill } from '../skills';

export interface PlayerSlice {
  human: PlayerState;
  ai: PlayerState;
  currentPlayer: Player;
  selectedTile: { row: number; col: number } | null;
  selectTile: (row: number, col: number) => void;
  checkSkillReadiness: (player: Player) => void;
  toggleSkill: (player: Player, skillId: string) => void;
  useSkill: (row: number, col: number) => Promise<void>;
  switchPlayer: () => void;
  makeAiMove: () => Promise<void>;
  selectClass: (player: Player, className: string) => void;
  equipSkill: (player: Player, skillId: string, slotIndex: number) => void;
}

const createInitialPlayerState = (isHuman: boolean = false): PlayerState => {
  const className = isHuman ? 'pyromancer' : 'shadowPriest';
  const defaultSkills = CLASSES[className].defaultSkills;
  
  return {
    health: 100,
    matchedColors: {
      red: 0,
      green: 0,
      blue: 0,
      yellow: 0,
      black: 0,
      empty: 0,
    },
    className,
    activeSkillId: null,
    equippedSkills: defaultSkills,
    statusEffects: [],
    skillCastCount: {}
  };
};

export const createPlayerSlice: StateCreator<GameState, [], [], PlayerSlice> = (set, get) => ({
  human: createInitialPlayerState(true),
  ai: createInitialPlayerState(false),
  currentPlayer: 'human',
  selectedTile: null,

  selectTile: (row: number, col: number) => {
    set({ selectedTile: { row, col } });
  },

  selectClass: (player: Player, className: string) => {
    console.log('selectClass called:', { player, className });
    
    if (!CLASSES[className]) {
      console.error('Class not found:', className);
      return;
    }
    
    const classData = CLASSES[className];
    console.log('Class data:', classData);
    
    const defaultSkills = classData.defaultSkills;
    console.log('Default skills:', defaultSkills);
    
    // Verify that all skills exist
    defaultSkills.forEach(skillId => {
      const skill = ALL_SKILLS[skillId];
      if (!skill) {
        console.error(`Skill not found: ${skillId}`);
      } else {
        console.log(`Skill found: ${skillId}`, skill);
      }
    });
    
    set(state => ({
      [player]: {
        ...state[player],
        className,
        activeSkillId: null,
        equippedSkills: defaultSkills,
        statusEffects: []
      }
    }));
    
    console.log(`Class ${className} selected for ${player}`);
  },

  equipSkill: (player: Player, skillId: string, slotIndex: number) => {
    if (!ALL_SKILLS[skillId]) return;
    
    set(state => {
      const equippedSkills = [...state[player].equippedSkills];
      equippedSkills[slotIndex] = skillId;
      
      return {
        [player]: {
          ...state[player],
          equippedSkills
        }
      };
    });
  },

  checkSkillReadiness: (player: Player) => {
    const playerState = get()[player];
    
    playerState.equippedSkills.forEach(skillId => {
      const skill = ALL_SKILLS[skillId];
      if (!skill) return;
      
      let isReady = true;
      // Check if player has enough resources for the skill
      Object.entries(skill.cost).forEach(([color, cost]) => {
        if (playerState.matchedColors[color as Color] < (cost || 0)) {
          isReady = false;
        }
      });

      if (isReady) {
        toast.success(`${player === 'human' ? 'Your' : 'AI\'s'} ${skill.name} is ready!`);
      }
    });
  },

  toggleSkill: (player: Player, skillId: string) => {
    console.log('toggleSkill called:', { player, skillId });
    
    const playerState = get()[player];
    const skill = ALL_SKILLS[skillId];
    
    if (!skill) {
      console.error('Skill not found:', skillId);
      return;
    }

    console.log('Skill found:', skill);
    console.log('Player resources:', playerState.matchedColors);
    console.log('Skill cost:', skill.cost);

    // Check if player has enough resources
    let canUseSkill = true;
    Object.entries(skill.cost).forEach(([color, cost]) => {
      if (playerState.matchedColors[color as Color] < (cost || 0)) {
        console.log(`Not enough ${color} resources: have ${playerState.matchedColors[color as Color]}, need ${cost}`);
        canUseSkill = false;
      }
    });

    if (!canUseSkill) {
      toast.error('Not enough resources for this skill!');
      return;
    }

    const newActiveSkillId = playerState.activeSkillId === skillId ? null : skillId;
    console.log('Setting active skill:', newActiveSkillId);

    set(state => ({
      [player]: {
        ...state[player],
        activeSkillId: newActiveSkillId
      }
    }));
  },

  useSkill: async (row: number, col: number) => {
    const state = get();
    const { currentPlayer, board } = state;
    const playerState = state[currentPlayer];
    const activeSkillId = playerState.activeSkillId;
    const activeSkill = activeSkillId ? ALL_SKILLS[activeSkillId] : null;

    console.log('useSkill called:', { row, col, activeSkillId, activeSkill });

    if (!activeSkill) {
      console.log('No active skill found');
      return;
    }

    // Check target color if skill requires specific target
    if (activeSkill.targetColor && board[row][col].color !== activeSkill.targetColor) {
      console.log('Target color mismatch:', { 
        required: activeSkill.targetColor, 
        actual: board[row][col].color 
      });
      toast.error(`This skill can only target ${activeSkill.targetColor} tiles!`);
      return;
    }

    // Consume resources
    const newMatchedColors = { ...playerState.matchedColors };
    Object.entries(activeSkill.cost).forEach(([color, cost]) => {
      newMatchedColors[color as Color] -= (cost || 0);
    });

    console.log('Applying skill effect:', activeSkill.id);
    
    // Apply skill effect
    try {
      await activeSkill.effect(state, row, col);
      console.log('Skill effect applied successfully');
    } catch (error) {
      console.error('Error applying skill effect:', error);
    }

    // Update player state
    set(state => ({
      [currentPlayer]: {
        ...state[currentPlayer],
        matchedColors: newMatchedColors,
        activeSkillId: null
      }
    }));

    console.log('Player state updated, switching player');
    
    // Switch turns after skill use
    get().switchPlayer();
  },

  switchPlayer: () => {
    const currentPlayer = get().currentPlayer;
    const nextPlayer = currentPlayer === 'human' ? 'ai' : 'human';
    
    // Update status effects
    const updateStatusEffects = (player: Player) => {
      const playerState = get()[player];
      // Apply mana conversion effects
      playerState.statusEffects.forEach(effect => {
        if (effect.manaConversion) {
          const { from, to, ratio } = effect.manaConversion;
          const fromAmount = playerState.matchedColors[from];
          
          if (fromAmount >= ratio) {
            const convertAmount = Math.floor(fromAmount / ratio);
            const remainingAmount = fromAmount % ratio;
            
            console.log(`Converting ${convertAmount * ratio} ${from} mana to ${convertAmount} ${to} mana`);
            
            set(state => ({
              [player]: {
                ...state[player],
                matchedColors: {
                  ...state[player].matchedColors,
                  [from]: remainingAmount,
                  [to]: state[player].matchedColors[to] + convertAmount
                }
              }
            }));
            
            toast.success(`Converted ${convertAmount * ratio} ${from} mana to ${convertAmount} ${to} mana!`);
          }
        }
      });
      
      // Update status effect durations
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
    const currentCombo = get().currentCombo;
    const hasComboExtraTurn = currentCombo >= 10;
    if (hasComboExtraTurn) {
      toast.success(`${currentCombo} combo! Extra turn granted!`);
    }
    const shouldSwitchPlayer = currentPlayer === 'human'
      ? (!humanHasExtraTurn && !hasComboExtraTurn)
      : (!aiHasExtraTurn && !hasComboExtraTurn);
      
      // Reset combo counter when switching players
    set({ currentCombo: 0 });
    if (shouldSwitchPlayer) {
      set(_ => ({
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
    // Wait for any ongoing animations to complete
    if (get().animationInProgress) {
      await get().waitForAnimation();
    }

    const { board, ai } = get();
    const BOARD_SIZE = board.length;
    const characterClass = CLASSES[ai.className];

    // Ensure it's still AI's turn after animations
    if (get().currentPlayer !== 'ai') {
      return;
    }

    // First, check if AI can use any skills
    const availableSkills = ai.equippedSkills
      .map(skillId => ALL_SKILLS[skillId])
      .filter(skill => {
        if (!skill) return false;
        
        let canUse = true;
        Object.entries(skill.cost).forEach(([color, cost]) => {
          if (ai.matchedColors[color as Color] < (cost || 0)) {
            canUse = false;
          }
        });
        return canUse;
      });

    if (availableSkills.length > 0) {
      // For now, just use the first available skill
      const skill = availableSkills[0];
      if (skill && skill.id) {
        get().toggleSkill('ai', skill.id);
        
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
    }

    // Helper function to evaluate a potential move
    const evaluateMove = (row1: number, col1: number, row2: number, col2: number): number => {
      // Don't allow moving frozen tiles
      if (board[row1][col1].isFrozen) {
        return -1;
      }

      // Create a temporary board with the move applied
      const tempBoard = board.map(row => [...row]);
      const temp = { ...tempBoard[row1][col1] };
      tempBoard[row1][col1] = { ...tempBoard[row2][col2] };
      tempBoard[row2][col2] = { ...temp };

      let score = 0;

      // Check for matches in all directions
      const checkMatch = (r: number, c: number, dr: number, dc: number, length: number): boolean => {
        const color = tempBoard[r][c].color;
        if (color === 'empty') return false;

        for (let i = 1; i < length; i++) {
          const newR = r + dr * i;
          const newC = c + dc * i;
          if (newR < 0 || newR >= BOARD_SIZE || newC < 0 || newC >= BOARD_SIZE) return false;
          if (tempBoard[newR][newC].color !== color) return false;
        }
        return true;
      };

      // Check horizontal matches
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE - 2; c++) {
          if (checkMatch(r, c, 0, 1, 3)) {
            const color = tempBoard[r][c].color;
            score += 1000; // Base score for a match
            if (color === characterClass.primaryColor) score += 5000;
            else if (color === characterClass.secondaryColor) score += 3000;
            
            // Check for 4 or 5 matches
            if (c < BOARD_SIZE - 3 && checkMatch(r, c, 0, 1, 4)) {
              score += 2000;
              if (c < BOARD_SIZE - 4 && checkMatch(r, c, 0, 1, 5)) {
                score += 3000;
              }
            }
          }
        }
      }

      // Check vertical matches
      for (let c = 0; c < BOARD_SIZE; c++) {
        for (let r = 0; r < BOARD_SIZE - 2; r++) {
          if (checkMatch(r, c, 1, 0, 3)) {
            const color = tempBoard[r][c].color;
            score += 1000; // Base score for a match
            if (color === characterClass.primaryColor) score += 5000;
            else if (color === characterClass.secondaryColor) score += 3000;
            
            // Check for 4 or 5 matches
            if (r < BOARD_SIZE - 3 && checkMatch(r, c, 1, 0, 4)) {
              score += 2000;
              if (r < BOARD_SIZE - 4 && checkMatch(r, c, 1, 0, 5)) {
                score += 3000;
              }
            }
          }
        }
      }

      return score;
    };

    // Find the best move
    let bestScore = -1;
    let bestMove: { row1: number; col1: number; row2: number; col2: number } | null = null;

    // Check horizontal swaps
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        const score = evaluateMove(row, col, row, col + 1);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { row1: row, col1: col, row2: row, col2: col + 1 };
        }
      }
    }

    // Check vertical swaps
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 1; row++) {
        const score = evaluateMove(row, col, row + 1, col);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { row1: row, col1: col, row2: row + 1, col2: col };
        }
      }
    }

    if (bestMove) {
      // Visual feedback for AI's move
      get().selectTile(bestMove.row1, bestMove.col1);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      get().selectTile(bestMove.row2, bestMove.col2);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear selection before swap
      set({ selectedTile: null });
      
      // Execute the move
      await get().swapTiles(bestMove.row1, bestMove.col1, bestMove.row2, bestMove.col2);
      return;
    }

    toast.error("AI couldn't find a move!");
    get().switchPlayer();
  },
}); 