import { ClassSkill } from './types';
import { toast } from 'react-hot-toast';
import { Color, Tile } from '../types';
import { ALL_SKILLS } from './index';

// Nature Weaver Skills
export const NATURE_WEAVER_SKILLS: ClassSkill[] = [
  {
    id: 'fertile_ground',
    name: 'Fertile Ground',
    description: 'Convert random tiles to green. Each cast increases cost by 1 and converts one more tile.',
    cost: { green: 2 },
    primaryColor: 'green',
    effect: async (state) => {
      const currentPlayer = state[state.currentPlayer];
      const castCount = (currentPlayer.skillCastCount['fertile_ground'] || 0);
      const baseCost = 2;
      const currentCost = baseCost + castCount;
      
      // Check if we have enough resources for the increased cost
      if (currentPlayer.matchedColors.green < currentCost) {
        toast.error(`Needs ${currentCost} green mana!`);
        return;
      }

      // Consume the increased cost
      currentPlayer.matchedColors.green -= currentCost;
      
      // Number of tiles to convert is castCount + 1 (first cast converts 1, second converts 2, etc)
      const tilesToConvert = castCount + 1;
      
      // Create a list of all non-green tiles
      const nonGreenTiles: { row: number; col: number }[] = [];
      state.board.forEach((row, rowIndex) => {
        row.forEach((tile, colIndex) => {
          if (tile.color !== 'green') {
            nonGreenTiles.push({ row: rowIndex, col: colIndex });
          }
        });
      });

      // Randomly select tiles to convert
      const newBoard = state.board.map(row => [...row]);
      for (let i = 0; i < Math.min(tilesToConvert, nonGreenTiles.length); i++) {
        const randomIndex = Math.floor(Math.random() * nonGreenTiles.length);
        const { row, col } = nonGreenTiles[randomIndex];
        nonGreenTiles.splice(randomIndex, 1);
        
        // Mark the tile as matched first to trigger explode animation
        newBoard[row][col] = {
          ...newBoard[row][col],
          isMatched: true,
          isAnimating: true
        };
      }

      // Update the board to show the explode animation
      state.board = newBoard;
      
      // Wait for explode animation
      await state.waitForAllAnimations();
      
      // Now convert the tiles to green with fallIn animation
      const finalBoard = newBoard.map(row => row.map(tile => 
        tile.isMatched ? {
          color: 'green' as Color,
          isMatched: false,
          isNew: false,
          isAnimating: true,
          isFrozen: false
        } as Tile : tile
      ));
      
      // Update the board
      state.board = finalBoard;
      
      // Update cast count
      currentPlayer.skillCastCount['fertile_ground'] = castCount + 1;

      // Wait for fall animation
      await state.waitForAllAnimations();
      
      // Process any matches that might have formed
      await state.processNewBoard(finalBoard);

      toast.success(`Converted ${tilesToConvert} tiles to green! Next cast will cost ${currentCost + 1} green mana.`);
    }
  },
  {
    id: 'golden_growth',
    name: 'Golden Growth',
    description: 'Convert a random 2x2 area to alternating green/yellow',
    cost: { green: 3, yellow: 3 },
    primaryColor: 'green',
    secondaryColor: 'yellow',
    effect: async (state) => {
      // Find valid positions (not on edges)
      const validPositions: { row: number; col: number }[] = [];
      for (let row = 0; row < state.board.length - 1; row++) {
        for (let col = 0; col < state.board[0].length - 1; col++) {
          validPositions.push({ row, col });
        }
      }

      // Choose random position
      const randomIndex = Math.floor(Math.random() * validPositions.length);
      const { row, col } = validPositions[randomIndex];
      
      const newBoard = state.board.map(r => [...r]);
      
      // First mark the tiles as matched to trigger explode animation
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          newBoard[row + i][col + j] = {
            ...newBoard[row + i][col + j],
            isMatched: true,
            isAnimating: true
          };
        }
      }

      // Update the board to show the explode animation
      state.board = newBoard;
      
      // Wait for explode animation
      await state.waitForAllAnimations();
      
      // Now convert to alternating pattern with fallIn animation
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          newBoard[row + i][col + j] = {
            color: ((i + j) % 2 === 0 ? 'green' : 'yellow') as Color,
            isMatched: false,
            isNew: false,
            isAnimating: true,
            isFrozen: false
          } as Tile;
        }
      }

      // Update the board
      state.board = newBoard;
      
      // Wait for fall animation
      await state.waitForAllAnimations();
      
      // Process any matches that might have formed
      await state.processNewBoard(newBoard);

      toast.success('Created alternating green/yellow pattern!');
    }
  }
];

// Alchemist Skills (green primary)
export const ALCHEMIST_SKILLS: ClassSkill[] = [
  {
    id: 'transmutation',
    name: 'Transmutation',
    description: 'Convert all tiles of one color to another color',
    cost: { green: 4, red: 4 },
    primaryColor: 'green',
    secondaryColor: 'red',
    effect: async (state, row, col) => {
      const sourceColor = state.board[row][col].color;
      const colors: Color[] = ['red', 'green', 'blue', 'yellow', 'black'];
      const targetColor = colors.find(c => c !== sourceColor) || 'red';
      
      // First mark all tiles to be converted as matched
      const newBoard = state.board.map(r => 
        r.map(tile => 
          tile.color === sourceColor
            ? { ...tile, isMatched: true, isAnimating: true }
            : tile
        )
      );
      
      // Update board to show explode animation
      state.board = newBoard;
      
      // Wait for explode animation
      await state.waitForAllAnimations();
      
      // Now convert to new color with fallIn animation
      const finalBoard = newBoard.map(r => 
        r.map(tile => 
          tile.isMatched ? {
            color: targetColor as Color,
            isMatched: false,
            isNew: false,
            isAnimating: true,
            isFrozen: false
          } as Tile : tile
        )
      );
      
      // Update the board
      state.board = finalBoard;
      
      // Wait for fall animation
      await state.waitForAllAnimations();
      
      // Process any matches that might have formed
      await state.processNewBoard(finalBoard);
      
      toast.success(`Converted ${sourceColor} tiles to ${targetColor}!`);
    }
  },
  {
    id: 'catalyst',
    name: 'Catalyst',
    description: 'Next 3 matches generate double resources and deal double damage',
    cost: { green: 5, red: 5 },
    primaryColor: 'green',
    secondaryColor: 'red',
    effect: async (state) => {
      state[state.currentPlayer].statusEffects.push({
        damageMultiplier: 2,
        resourceMultiplier: 2,
        turnsRemaining: 3
      });
      toast.success('Next 3 matches are empowered!');
    }
  }
]; 