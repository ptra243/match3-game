import { ClassSkill } from './types';
import { toast } from 'react-hot-toast';

// Shadow Priest Skills
export const SHADOW_PRIEST_SKILLS: ClassSkill[] = [
  {
    id: 'void_touch',
    name: 'Void Touch',
    description: 'Enemy takes 50% more damage from all matches for 3 turns',
    cost: { black: 3 },
    primaryColor: 'black',
    effect: async (state) => {
      const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
      state[opponent].statusEffects.push({
        damageMultiplier: 1.5,
        resourceMultiplier: 1,
        turnsRemaining: 3
      });
      toast.success('Enemy will take 50% more damage for 3 turns!');
    }
  },
  {
    id: 'dark_ritual',
    name: 'Dark Ritual',
    description: 'Convert a 2x2 area to black tiles',
    cost: { black: 3, blue: 3 },
    primaryColor: 'black',
    secondaryColor: 'blue',
    targetColor: 'black',
    effect: async (state, row, col) => {
      const newBoard = state.board.map(r => [...r]);
      for (let i = row; i < Math.min(row + 2, state.board.length); i++) {
        for (let j = col; j < Math.min(col + 2, state.board[0].length); j++) {
          newBoard[i][j] = {
            ...newBoard[i][j],
            color: 'black',
            isAnimating: true
          };
        }
      }
      state.board = newBoard;
      toast.success('Area converted to black tiles!');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
]; 