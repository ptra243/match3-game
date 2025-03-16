import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameTile } from './GameTile';

interface GameBoardGridProps {
  activeTile: { row: number; col: number } | null;
}

export const GameBoardGrid: React.FC<GameBoardGridProps> = ({ activeTile }) => {
  const { board, selectedTile, signalAnimationComplete } = useGameStore();

  // Debug board state
  React.useEffect(() => {
    console.log('GameBoardGrid - Current board state:', {
      boardSize: board.length,
      emptyTiles: board.flat().filter(t => t.color === 'empty').length,
      nonEmptyTiles: board.flat().filter(t => t.color !== 'empty').length,
      totalTiles: board.flat().length,
      colors: board.flat().reduce((acc, tile) => {
        acc[tile.color] = (acc[tile.color] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
  }, [board]);

  // Track animation count to know when all animations are complete
  const [animatingTiles, setAnimatingTiles] = React.useState(0);
  const animatingTilesRef = React.useRef(0);
  const boardRef = React.useRef(board);

  // Update animation count when board changes
  React.useEffect(() => {
    // Only process if the board has actually changed
    if (board === boardRef.current) {
      return;
    }
    boardRef.current = board;

    let count = 0;
    board.forEach(row => {
      row.forEach(tile => {
        if (tile.isMatched || tile.isAnimating) {
          count++;
        }
      });
    });
    console.log('Animation tracking - Board changed, counting animations:', {
      matched: board.flat().filter(t => t.isMatched).length,
      animating: board.flat().filter(t => t.isAnimating).length,
      total: count
    });
    
    setAnimatingTiles(count);
    animatingTilesRef.current = count;
  }, [board]);

  // When all animations complete, signal it
  React.useEffect(() => {
    console.log('Animation tracking - animatingTiles count changed:', {
      state: animatingTiles,
      ref: animatingTilesRef.current,
      matched: board.flat().filter(t => t.isMatched).length,
      animating: board.flat().filter(t => t.isAnimating).length
    });
    
    if (animatingTiles === 0 && animatingTilesRef.current === 0) {
      console.log('Animation tracking - All animations complete, sending signal');
      signalAnimationComplete();
    }
  }, [animatingTiles, signalAnimationComplete, board]);

  const handleAnimationEnd = React.useCallback((row: number, col: number) => {
    console.log('Animation tracking - Animation completed for tile:', { row, col, 
      isMatched: board[row][col].isMatched,
      isAnimating: board[row][col].isAnimating
    });
    
    const newCount = Math.max(0, animatingTilesRef.current - 1);
    animatingTilesRef.current = newCount;
    setAnimatingTiles(newCount);
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
            onAnimationEnd={() => handleAnimationEnd(rowIndex, colIndex)}
          />
        ))
      )}
    </div>
  );
}; 