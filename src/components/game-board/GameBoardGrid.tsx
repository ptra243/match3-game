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
      className="
        w-full aspect-square
        min-w-[240px] min-h-[240px]
        max-w-[240px] max-h-[240px]
        sm:max-w-[280px] sm:max-h-[280px]
        md:max-w-[32rem] md:max-h-[32rem]
        md:w-[32rem] md:h-[32rem]
        grid 
        gap-0.5 sm:gap-1 md:gap-1.5
        p-0.5 sm:p-2 md:p-4
        bg-slate-800
        rounded-lg md:rounded-xl
        relative
        mx-auto
        overflow-hidden
      "
      style={{
        gridTemplateColumns: `repeat(${board.length}, 1fr)`,
        gridTemplateRows: `repeat(${board.length}, 1fr)`,
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