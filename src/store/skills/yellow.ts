import { ClassSkill } from './types';
import { toast } from 'react-hot-toast';

// Time Weaver Skills
export const TIME_WEAVER_SKILLS: ClassSkill[] = [
  {
    id: 'time_loop',
    name: 'Time Loop',
    description: 'Copy your last match pattern to a new location',
    cost: { yellow: 5, blue: 3 },
    primaryColor: 'yellow',
    secondaryColor: 'blue',
    effect: async (state, targetRow, targetCol) => {
      // Store current board state
      const currentBoard = state.board.map(r => [...r]);
      
      // Get the 2x2 pattern from the source location (0,0)
      const pattern = [
        { row: 0, col: 0, color: currentBoard[0][0].color },
        { row: 0, col: 1, color: currentBoard[0][1].color },
        { row: 1, col: 0, color: currentBoard[1][0].color },
        { row: 1, col: 1, color: currentBoard[1][1].color }
      ];
      
      // Apply pattern at target location
      const newBoard = currentBoard.map((r, i) => 
        r.map((tile, j) => {
          const patternTile = pattern.find(p => 
            i === targetRow + p.row && 
            j === targetCol + p.col
          );
          
          return patternTile
            ? { ...tile, color: patternTile.color, isAnimating: true }
            : tile;
        })
      );
      
      state.board = newBoard;
      toast.success('Replicated match pattern!');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  },
  {
    id: 'temporal_surge',
    name: 'Temporal Surge',
    description: 'Take an extra turn after your next match',
    cost: { yellow: 6, blue: 4 },
    primaryColor: 'yellow',
    secondaryColor: 'blue',
    effect: async (state) => {
      state[state.currentPlayer].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 1,
        extraTurn: true
      });
      toast.success('Your next match grants an extra turn!');
    }
  }
]; 