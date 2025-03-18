import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameTile } from './GameTile';
import { debugLog } from '../../store/slices/debug';

interface GameBoardGridProps {
  activeTile: { row: number; col: number } | null;
}

export const GameBoardGrid: React.FC<GameBoardGridProps> = ({ activeTile }) => {
  const { board, selectedTile } = useGameStore();

  // Debug board state
  React.useEffect(() => {
    debugLog('GAME_BOARD','game board state',{boardSize: board.length,
      emptyTiles: board.flat().filter(t => t.color === 'empty').length,
      nonEmptyTiles: board.flat().filter(t => t.color !== 'empty').length,
      totalTiles: board.flat().length,
      colors: board.flat().reduce((acc, tile) => {
        acc[tile.color] = (acc[tile.color] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
  }, [board]);

  return (
    <div
      className="w-[32rem] h-[32rem] grid gap-1 relative"
      style={{
        gridTemplateColumns: `repeat(${board.length}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${board.length}, minmax(0, 1fr))`,
      }}
    >
      {board.map((row, rowIndex) =>
        row.map((tile, colIndex) => (
          <GameTile
            key={`${rowIndex}-${colIndex}`}
            tile={tile}
            row={rowIndex}
            col={colIndex}
            isDragging={activeTile?.row === rowIndex && activeTile?.col === colIndex}
            isAiSelected={selectedTile?.row === rowIndex && selectedTile?.col === colIndex}
          />
        ))
      )}
    </div>
  );
}; 