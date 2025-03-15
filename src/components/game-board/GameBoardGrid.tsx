import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameTile } from './GameTile';

interface GameBoardGridProps {
  activeTile: { row: number; col: number } | null;
}

export const GameBoardGrid: React.FC<GameBoardGridProps> = ({ activeTile }) => {
  const { board, selectedTile, signalAnimationComplete } = useGameStore();

  // Track animation count to know when all animations are complete
  const [animatingTiles, setAnimatingTiles] = React.useState(0);

  React.useEffect(() => {
    // Count how many tiles are currently animating
    let count = 0;
    board.forEach(row => {
      row.forEach(tile => {
        if (tile.isAnimating) count++;
      });
    });
    setAnimatingTiles(count);
  }, [board]);

  // When all animations complete, signal it
  React.useEffect(() => {
    if (animatingTiles === 0) {
      signalAnimationComplete();
    }
  }, [animatingTiles, signalAnimationComplete]);

  const handleAnimationEnd = React.useCallback(() => {
    setAnimatingTiles(prev => Math.max(0, prev - 1));
  }, []);

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
            onAnimationEnd={tile.isAnimating ? handleAnimationEnd : undefined}
          />
        ))
      )}
    </div>
  );
}; 