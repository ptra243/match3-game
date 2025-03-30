import { GameState, Color } from '../../types';
import { debugLog } from '../../slices/debug';
import { CLASSES } from '../../classes';
import { ALL_SKILLS } from '../../skills';
import { toast } from 'react-hot-toast';
import { MoveEvaluation, MoveOption } from '../match/moveEvaluation';

const selectMoveByDifficulty = (moves: MoveOption[], difficulty: number): MoveOption | null => {
  if (moves.length === 0) return null;
  
  if (moves.length === 1) {
    return moves[0];
  }

  // Choose a move based on difficulty
  // Difficulty 5: Always pick the best move (index 0)
  // Difficulty 1-4: Potentially pick suboptimal moves
  
  // Calculate the index range based on difficulty
  // Lower difficulty means higher chance of picking suboptimal moves
  const maxIndex = Math.min(5 - difficulty, moves.length - 1);
  
  // Randomly select an index within our range
  // This ensures that even at lowest difficulty, the worst move is still from top moves
  const selectedIndex = Math.floor(Math.random() * (maxIndex + 1));
  
  debugLog('AI', 'Move selection', {
    difficulty,
    possibleMovesCount: moves.length,
    maxIndex,
    selectedIndex,
    bestMoveScore: moves[0].score,
    selectedMoveScore: moves[selectedIndex].score
  });

  return moves[selectedIndex];
};

export const AI = {
  makeMove: async (state: GameState) => {
    // Wait for any ongoing animations to complete
    await state.waitForAllAnimations();

    const { ai, aiDifficulty } = state;
    const characterClass = CLASSES[ai.className];

    // Ensure it's still AI's turn after animations
    if (state.currentPlayer !== 'ai') {
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
        state.toggleSkill('ai', skill.id);
        
        // For skills with requiresTarget: false, toggleSkill will execute them immediately
        // Only handle targeted skills here
        if (skill.requiresTarget !== false) {
          // Find appropriate target for the skill
          if (skill.targetColor) {
            for (let row = 0; row < state.board.length; row++) {
              for (let col = 0; col < state.board.length; col++) {
                if (state.board[row][col].color === skill.targetColor) {
                  await state.useSkill(row, col);
                  return;
                }
              }
            }
          } else {
            // If no specific target color needed, just use at center of board
            const centerRow = Math.floor(state.board.length / 2);
            const centerCol = Math.floor(state.board.length / 2);
            await state.useSkill(centerRow, centerCol);
            return;
          }
        }
        // If we got here with a non-targeted skill, it was already executed by toggleSkill
        return;
      }
    }

    // Find and select the best move using the move evaluation system
    const topMoves = MoveEvaluation.findTopMoves(state, characterClass.primaryColor);
    const selectedMove = selectMoveByDifficulty(topMoves, aiDifficulty);

    if (selectedMove) {
      // Visual feedback for AI's move
      state.selectTile(selectedMove.row1, selectedMove.col1);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      state.selectTile(selectedMove.row2, selectedMove.col2);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear selection before swap
      state.selectedTile = null;
      
      // Execute the move
      await state.swapTiles(selectedMove.row1, selectedMove.col1, selectedMove.row2, selectedMove.col2);
      //switch player after move. If we have an extra turn, it will be handled in switchPlayer
      state.switchPlayer();
      return;
    }

    toast.error("AI couldn't find a move!");
    state.switchPlayer();
  },

  setDifficulty: (state: GameState, level: number) => {
    state.aiDifficulty = level;
  }
}; 