import { Color } from './types';
import { StateCreator } from 'zustand';
import { GameState } from './types';
import { toast } from 'react-hot-toast';

export interface ClassSkill {
  name: string;
  description: string;
  cost: Partial<Record<Color, number>>;
  primaryColor: Color;
  secondaryColor?: Color;
  targetColor?: Color;
  effect: (state: GameState, row: number, col: number) => Promise<void>;
}

export interface CharacterClass {
  name: string;
  description: string;
  primaryColor: Color;
  secondaryColor: Color;
  skills: ClassSkill[];
}

export const CLASSES: Record<string, CharacterClass> = {
  pyromancer: {
    name: 'Pyromancer',
    description: 'Masters of explosive damage and combo building',
    primaryColor: 'red',
    secondaryColor: 'yellow',
    skills: [
      {
        name: 'Fiery Soul',
        description: 'Deal double damage and convert excess red mana to yellow (3:1 ratio) for 3 turns',
        cost: { red: 5 },
        primaryColor: 'red',
        secondaryColor: 'yellow',
        effect: async (state) => {
          const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
          state[opponent].statusEffects.push({
            damageMultiplier: 2,
            resourceMultiplier: 1,
            turnsRemaining: 3
          });
          
          // Add mana conversion effect
          state[state.currentPlayer].statusEffects.push({
            damageMultiplier: 1,
            resourceMultiplier: 1,
            turnsRemaining: 3,
            manaConversion: {
              from: 'red',
              to: 'yellow',
              ratio: 3
            }
          });
          
          toast.success('Red matches deal double damage and excess red mana converts to yellow!');
        }
      },
      {
        name: 'Fireball',
        description: 'Choose a red tile to create an explosion, dealing 5 damage per red tile destroyed',
        cost: { red: 4, yellow: 3 },
        primaryColor: 'red',
        secondaryColor: 'yellow',
        targetColor: 'red',
        effect: async (state, row, col) => {
          if (state.board[row][col].color !== 'red') {
            toast.error('Must target a red tile!');
            return;
          }

          const newBoard = state.board.map(r => [...r]);
          let destroyedTiles = [];

          // Find all tiles within 2 spaces (including diagonals)
          for (let i = Math.max(0, row - 2); i <= Math.min(state.board.length - 1, row + 2); i++) {
            for (let j = Math.max(0, col - 2); j <= Math.min(state.board[0].length - 1, col + 2); j++) {
              // Calculate Manhattan distance
              const distance = Math.abs(i - row) + Math.abs(j - col);
              if (distance <= 2) {
                destroyedTiles.push({
                  row: i,
                  col: j,
                  color: newBoard[i][j].color
                });
                newBoard[i][j] = {
                  ...newBoard[i][j],
                  color: 'empty',
                  isAnimating: true
                };
              }
            }
          }

          // Count red tiles and update resources
          const redTiles = destroyedTiles.filter(t => t.color === 'red').length;
          const damage = redTiles * 5; // 5 damage per red tile

          // Update opponent's health
          const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
          state[opponent].health = Math.max(0, state[opponent].health - damage);

          // Add resources from destroyed tiles
          const currentPlayer = state[state.currentPlayer];
          destroyedTiles.forEach(tile => {
            if (tile.color !== 'empty') {
              currentPlayer.matchedColors[tile.color]++;
            }
          });

          state.board = newBoard;
          toast.success(`Fireball exploded for ${damage} damage!`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    ]
  },
  cryomancer: {
    name: 'Cryomancer',
    description: 'Masters of control and resource generation',
    primaryColor: 'blue',
    secondaryColor: 'yellow',
    skills: [
      {
        name: 'Ice Shard',
        description: 'Freeze a tile and its neighbors, making them unmovable but countable in matches. Deals 4 damage.',
        cost: { blue: 4 },
        primaryColor: 'blue',
        effect: async (state, row, col) => {
          const surroundingTiles = [
            { row: row - 1, col },
            { row: row + 1, col },
            { row, col: col - 1 },
            { row, col: col + 1 },
            { row, col }
          ].filter(pos => 
            pos.row >= 0 && pos.row < state.board.length &&
            pos.col >= 0 && pos.col < state.board[0].length
          );

          const newBoard = state.board.map(row => [...row]);
          surroundingTiles.forEach(pos => {
            newBoard[pos.row][pos.col] = {
              ...newBoard[pos.row][pos.col],
              isFrozen: true,
              isAnimating: true
            };
          });
          state.board = newBoard;

          // Deal damage
          const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
          state[opponent].health = Math.max(0, state[opponent].health - 4);

          toast.success('Tiles frozen and dealt 4 damage!');
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      },
      {
        name: 'Golden Frost',
        description: 'Frozen tiles generate double resources for 3 turns',
        cost: { blue: 3, yellow: 3 },
        primaryColor: 'blue',
        secondaryColor: 'yellow',
        effect: async (state) => {
          state[state.currentPlayer].statusEffects.push({
            damageMultiplier: 1,
            resourceMultiplier: 2,
            turnsRemaining: 3
          });
          toast.success('Frozen tiles will generate double resources for 3 turns!');
        }
      }
    ]
  },
  natureWeaver: {
    name: 'Nature Weaver',
    description: 'Masters of growth and prosperity',
    primaryColor: 'green',
    secondaryColor: 'yellow',
    skills: [
      {
        name: 'Fertile Ground',
        description: 'After your next match, convert tiles to green. Each cast increases cost by 1 and converts 1 more tile.',
        cost: { green: 4 },
        primaryColor: 'green',
        effect: async (state) => {
          const currentPlayer = state[state.currentPlayer];
          const castCount = currentPlayer.skillCastCount[0] || 0;  // Index 0 is Fertile Ground
          
          // Add status effect for tile conversion
          state[state.currentPlayer].statusEffects.push({
            damageMultiplier: 1,
            resourceMultiplier: 1,
            turnsRemaining: 1,
            convertTiles: {
              color: 'green',
              count: castCount + 1  // Convert 1 more tile than previous cast
            }
          });

          // Increment cast count and increase cost
          currentPlayer.skillCastCount[0] = castCount + 1;
          const skill = CLASSES[currentPlayer.className].skills[0];
          skill.cost = { green: 4 + castCount };  // Base cost + number of previous casts

          toast.success(`Next match will convert ${castCount + 1} tiles to green!`);
        }
      },
      {
        name: 'Golden Growth',
        description: 'Convert a 2x2 area to alternating green/yellow',
        cost: { green: 3, yellow: 3 },
        primaryColor: 'green',
        secondaryColor: 'yellow',
        effect: async (state, row, col) => {
          const newBoard = state.board.map(r => [...r]);
          for (let i = row; i < Math.min(row + 2, state.board.length); i++) {
            for (let j = col; j < Math.min(col + 2, state.board[0].length); j++) {
              newBoard[i][j] = {
                ...newBoard[i][j],
                color: ((i + j) % 2 === 0 ? 'green' : 'yellow') as Color,
                isAnimating: true
              };
            }
          }
          state.board = newBoard;
          toast.success('Created alternating green/yellow pattern!');
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    ]
  },
  bloodMage: {
    name: 'Blood Mage',
    description: 'Masters of sacrifice and power',
    primaryColor: 'red',
    secondaryColor: 'blue',
    skills: [
      {
        name: 'Blood Surge',
        description: 'Take 5 damage to enhance next match damage',
        cost: { red: 3, blue: 3 },
        primaryColor: 'red',
        secondaryColor: 'blue',
        effect: async (state) => {
          const player = state.currentPlayer;
          state[player].health = Math.max(1, state[player].health - 5);
          state[player].statusEffects.push({
            damageMultiplier: 2.5,
            resourceMultiplier: 1,
            turnsRemaining: 2
          });
          toast.success('Sacrificed health for power - next matches deal 2.5x damage!');
        }
      },
      {
        name: 'Frost Fire',
        description: 'Red matches freeze tiles, blue matches ignite them',
        cost: { red: 4, blue: 4 },
        primaryColor: 'red',
        secondaryColor: 'blue',
        effect: async (state) => {
          state[state.currentPlayer].statusEffects.push({
            damageMultiplier: 2,
            resourceMultiplier: 2,
            turnsRemaining: 3
          });
          toast.success('Elemental chaos activated - matches have dual effects!');
        }
      }
    ]
  },
  shadowPriest: {
    name: 'Shadow Priest',
    description: 'Masters of dark magic and control',
    primaryColor: 'black',
    secondaryColor: 'blue',
    skills: [
      {
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
    ]
  },
  alchemist: {
    name: 'Alchemist',
    description: 'Masters of transformation and resource manipulation',
    primaryColor: 'green',
    secondaryColor: 'red',
    skills: [
      {
        name: 'Transmutation',
        description: 'Convert all tiles of one color to another color',
        cost: { green: 4, red: 4 },
        primaryColor: 'green',
        secondaryColor: 'red',
        effect: async (state, row, col) => {
          const sourceColor = state.board[row][col].color;
          const colors: Color[] = ['red', 'green', 'blue', 'yellow', 'black'];
          const targetColor = colors.find(c => c !== sourceColor) || 'red';
          
          const newBoard = state.board.map(r => 
            r.map(tile => 
              tile.color === sourceColor
                ? { ...tile, color: targetColor as Color, isAnimating: true }
                : tile
            )
          );
          state.board = newBoard;
          toast.success(`Converted ${sourceColor} tiles to ${targetColor}!`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      },
      {
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
    ]
  },
  stormMage: {
    name: 'Storm Mage',
    description: 'Masters of chain reactions and area control',
    primaryColor: 'blue',
    secondaryColor: 'black',
    skills: [
      {
        name: 'Chain Lightning',
        description: 'Convert a line of tiles to blue, dealing damage for each conversion',
        cost: { blue: 4, black: 3 },
        primaryColor: 'blue',
        secondaryColor: 'black',
        effect: async (state, row, col) => {
          const newBoard = state.board.map(r => [...r]);
          let damage = 0;
          
          // Convert horizontal line
          for (let j = 0; j < state.board[0].length; j++) {
            if (newBoard[row][j].color !== 'blue') {
              newBoard[row][j] = {
                ...newBoard[row][j],
                color: 'blue',
                isAnimating: true
              };
              damage += 2;
            }
          }
          
          state.board = newBoard;
          
          // Apply damage
          const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
          state[opponent].health = Math.max(0, state[opponent].health - damage);
          
          toast.success(`Chain Lightning dealt ${damage} damage!`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      },
      {
        name: 'Storm Front',
        description: 'Summon a storm that enhances blue and black matches',
        cost: { blue: 3, black: 3 },
        primaryColor: 'blue',
        secondaryColor: 'black',
        effect: async (state) => {
          state[state.currentPlayer].statusEffects.push({
            damageMultiplier: 1.5,
            resourceMultiplier: 1.5,
            turnsRemaining: 4
          });
          toast.success('Storm enhances your matches for 4 turns!');
        }
      }
    ]
  },
  timeWeaver: {
    name: 'Time Weaver',
    description: 'Masters of turn manipulation and board control',
    primaryColor: 'yellow',
    secondaryColor: 'blue',
    skills: [
      {
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
    ]
  }
}; 