import { GameState, PlayerType, Color } from '../../types';
import { debugLog } from '../../slices/debug';
import { ALL_SKILLS } from '../../skills';
import { CLASSES } from '../../classes';
import { toast } from 'react-hot-toast';

export const PlayerActions = {
  selectTile: (state: GameState, row: number, col: number) => {
    state.selectedTile = { row, col };
  },

  checkSkillReadiness: (state: GameState, player: PlayerType) => {
    const playerState = state[player];
    
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

  toggleSkill: (state: GameState, player: PlayerType, skillId: string) => {
    debugLog('PLAYER_ACTION', 'toggleSkill called:', { player, skillId });
    
    const playerState = state[player];
    const skill = ALL_SKILLS[skillId];
    
    if (!skill) {
      debugLog('PLAYER_ACTION', 'Skill not found:', skillId);
      return;
    }

    debugLog('PLAYER_ACTION', 'Skill found:', skill);
    debugLog('PLAYER_ACTION', 'Player resources:', playerState.matchedColors);
    debugLog('PLAYER_ACTION', 'Skill cost:', skill.cost);

    // Check if player has enough resources
    let canUseSkill = true;
    Object.entries(skill.cost).forEach(([color, cost]) => {
      if (playerState.matchedColors[color as Color] < (cost || 0)) {
        debugLog('PLAYER_ACTION', `Not enough ${color} resources: have ${playerState.matchedColors[color as Color]}, need ${cost}`);
        canUseSkill = false;
      }
    });

    if (!canUseSkill) {
      toast.error('Not enough resources for this skill!');
      return;
    }

    // Otherwise, set it as the active skill for targeting
    const newActiveSkillId = playerState.activeSkillId === skillId ? null : skillId;
    debugLog('PLAYER_ACTION', 'Setting active skill for targeting:', newActiveSkillId);

    // Create a new state object with the updated activeSkillId
    state[player] = {
      ...playerState,
      activeSkillId: newActiveSkillId
    };

    // If the skill doesn't require a target, execute it immediately
    if (!skill.requiresTarget) {
      debugLog('PLAYER_ACTION', 'Skill does not require target, executing immediately');
      state.useSkill(0, 0);
    }
  },

  useSkill: async (state: GameState, row: number, col: number) => {
    const { currentPlayer, board } = state;
    const playerState = state[currentPlayer];
    const activeSkillId = playerState.activeSkillId;

    debugLog('PLAYER_ACTION', 'useSkill starting:', {
      row,
      col,
      activeSkillId,
      currentPlayer,
      tileState: board[row][col],
      playerState
    });
    
    if (!activeSkillId) {
      debugLog('PLAYER_ACTION', 'No active skill found');
      return;
    }

    const activeSkill = ALL_SKILLS[activeSkillId];
    if (!activeSkill) {
      debugLog('PLAYER_ACTION', 'Invalid skill ID:', activeSkillId);
      return;
    }

    debugLog('PLAYER_ACTION', 'Skill validation:', {
      skillId: activeSkillId,
      skill: activeSkill,
      targetColor: activeSkill.targetColor,
      tileColor: board[row][col].color,
      isValidTarget: !activeSkill.targetColor || board[row][col].color === activeSkill.targetColor
    });

    // Check target color if skill requires specific target
    if (activeSkill.targetColor && board[row][col].color !== activeSkill.targetColor) {
      debugLog('PLAYER_ACTION', 'Target color mismatch:', { 
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

    debugLog('PLAYER_ACTION', 'Applying skill effect:', {
      skillId: activeSkill.id,
      targetTile: [row, col],
      boardState: board[row][col]
    });
    
    // Clear selected tile before applying effect to prevent animation interference
    state.selectedTile = null;
    
    // Apply skill effect
    try {
      await activeSkill.effect(state, row, col);
      debugLog('PLAYER_ACTION', 'Skill effect completed, getting updated board');
      // Make sure all animations are complete before getting the board state
      await state.waitForAllAnimations();

      // Get the current board state after the skill effect
      const updatedBoard = state.board;
      debugLog('PLAYER_ACTION', 'Processing updated board:', {
        centerTileState: updatedBoard[row][col],
        hasMatchedTiles: updatedBoard.some(row => row.some(tile => tile.isMatched))
      });
      
      // Ensure board is fully processed - this fills empty tiles and drops tiles
      await state.processNewBoard(updatedBoard);
      
      // Wait for all animations to complete again after processing the board
      await state.waitForAllAnimations();
    } catch (error) {
      debugLog('PLAYER_ACTION', 'Error applying skill effect:', error);
    }

    // Update player state with new resources and clear active skill
    state[currentPlayer] = {
      ...playerState,
      matchedColors: newMatchedColors,
      activeSkillId: null
    };

    debugLog('PLAYER_ACTION', 'Player state updated, switching player');
    
    // Switch turns after skill use
    state.switchPlayer();
  },

  selectClass: (state: GameState, player: PlayerType, className: string) => {
    debugLog('PLAYER_ACTION', 'selectClass called:', { player, className });
    
    if (!CLASSES[className]) {
      debugLog('PLAYER_ACTION', 'Class not found:', className);
      return;
    }
    
    const classData = CLASSES[className];
    debugLog('PLAYER_ACTION', 'Class data:', classData);
    
    const defaultSkills = classData.defaultSkills;
    debugLog('PLAYER_ACTION', 'Default skills:', defaultSkills);
    
    // Verify that all skills exist
    defaultSkills.forEach(skillId => {
      const skill = ALL_SKILLS[skillId];
      if (!skill) {
        debugLog('PLAYER_ACTION', `Skill not found: ${skillId}`);
      } else {
        debugLog('PLAYER_ACTION', `Skill found: ${skillId}`, skill);
      }
    });
    
    state[player] = {
      ...state[player],
      className,
      activeSkillId: null,
      equippedSkills: defaultSkills,
      statusEffects: []
    };
    
    debugLog('PLAYER_ACTION', `Class ${className} selected for ${player}`);
  },

  equipSkill: (state: GameState, player: PlayerType, skillId: string, slotIndex: number) => {
    if (!ALL_SKILLS[skillId]) return;
    
    const equippedSkills = [...state[player].equippedSkills];
    equippedSkills[slotIndex] = skillId;
    
    state[player] = {
      ...state[player],
      equippedSkills
    };
  },

  takeDamage: (state: GameState, attacker: PlayerType, defender: PlayerType, damageAmount: number, isDirectDamage: boolean, isSkillDamage = false) => {
    let totalDamage = damageAmount;
    
    debugLog('PLAYER_ACTION', 'takeDamage called', {
      attacker,
      defender,
      initialDamage: damageAmount,
      isDirectDamage,
      isSkillDamage
    });
    
    // 1. Apply attacker's damage multiplier from status effects if it's direct damage
    if (isDirectDamage) {
      const attackerDamageMultiplier = state[attacker].statusEffects.reduce(
        (multiplier, effect) => multiplier * (effect.damageMultiplier || 1), 1
      );
      
      if (attackerDamageMultiplier !== 1) {
        totalDamage = Math.round(totalDamage * attackerDamageMultiplier);
        debugLog('PLAYER_ACTION', `Applied attacker damage multiplier: ${attackerDamageMultiplier}`, {
          originalDamage: damageAmount,
          multipliedDamage: totalDamage
        });
      }
      
      // 1.5. Apply skill-specific damage multiplier if applicable
      if (isSkillDamage) {
        const skillDamageMultiplier = state[attacker].statusEffects.reduce(
          (multiplier, effect) => multiplier * (effect.skillDamageMultiplier || 1), 1
        );
        
        if (skillDamageMultiplier !== 1) {
          const damageBeforeSkillMultiplier = totalDamage;
          totalDamage = Math.round(totalDamage * skillDamageMultiplier);
          debugLog('PLAYER_ACTION', `Applied skill damage multiplier: ${skillDamageMultiplier}`, {
            damageBeforeSkillMultiplier,
            damageAfterSkillMultiplier: totalDamage
          });
        }
      }
    }
    
    // 2. Apply defender's damage reduction from status effects
    const defenderDamageReduction = state[defender].statusEffects.reduce(
      (reduction, effect) => reduction + (effect.skillDamageReduction || 0), 0
    );
    
    if (defenderDamageReduction > 0) {
      const damageBeforeReduction = totalDamage;
      totalDamage = Math.max(0, totalDamage - defenderDamageReduction);
      debugLog('PLAYER_ACTION', `Applied damage reduction: ${defenderDamageReduction}`, {
        damageBeforeReduction,
        damageAfterReduction: totalDamage
      });
    }
    
    // 3. Apply defender's damage multiplier from status effects
    const defenderDamageMultiplier = state[defender].statusEffects.reduce(
      (multiplier, effect) => multiplier * (effect.damageMultiplier || 1), 1
    );
    
    if (defenderDamageMultiplier !== 1) {
      const damageBeforeMultiplier = totalDamage;
      totalDamage = Math.round(totalDamage * defenderDamageMultiplier);
      debugLog('PLAYER_ACTION', `Applied defender damage multiplier: ${defenderDamageMultiplier}`, {
        damageBeforeMultiplier,
        damageAfterMultiplier: totalDamage
      });
    }
    
    // 4. Apply defense
    const defense = state[defender].defense;
    if (defense > 0) {
      const damageBeforeDefense = totalDamage;
      totalDamage = Math.max(0, totalDamage - defense);
      debugLog('PLAYER_ACTION', `Applied defense: ${defense}`, {
        damageBeforeDefense,
        damageAfterDefense: totalDamage
      });
    }
    
    // 5. Apply the damage
    const player = state[defender];
    const newHealth = Math.max(0, player.health - totalDamage);
    
    debugLog('PLAYER_ACTION', 'Applying damage', {
      currentHealth: player.health,
      damage: totalDamage,
      newHealth
    });
    
    // Create a new state object with the updated health
    state[defender] = {
      ...player,
      health: newHealth
    };

    // 6. Check for game over
    if (newHealth <= 0) {
      state.isGameOver = true;
      debugLog('PLAYER_ACTION', 'Game over!', {
        winner: attacker
      });
    }
    
    return totalDamage;
  }
}; 