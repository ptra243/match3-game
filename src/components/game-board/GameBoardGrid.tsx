import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameTile } from './GameTile';

interface GameBoardGridProps {
  activeTile: { row: number; col: number } | null;
}

export const GameBoardGrid: React.FC<GameBoardGridProps> = ({ activeTile }) => {
  const { board, selectedTile } = useGameStore();

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
            onAnimationEnd={tile.isAnimating ? () => {
              // Animation end handled by the match slice
            } : undefined}
          />
        ))
      )}
    </div>
  );
}; 