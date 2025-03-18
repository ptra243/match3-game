import React from 'react';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  useSensor,
  useSensors,
  DragOverlay,
  TouchSensor,
} from '@dnd-kit/core';
import { useGameStore } from '../../store/gameStore';
import { GameBoardAnimations } from './GameBoardAnimations';
import { GameBoardGrid } from './GameBoardGrid';
import { GameTile } from './GameTile';
import { debugLog } from '../../store/slices/debug';

export const GameBoard: React.FC = () => {
  const { board, swapTiles, initializeBoard } = useGameStore();
  const [activeTile, setActiveTile] = React.useState<{ row: number; col: number } | null>(null);

  // Check if board is initialized
  React.useEffect(() => {
    const nonEmptyTiles = board.flat().filter(tile => tile.color !== 'empty').length;
    debugLog('GAME_BOARD', 'Board state check:', {
      totalTiles: board.flat().length,
      nonEmptyTiles,
      isEmpty: nonEmptyTiles === 0
    });
    
    // If board is empty, initialize it
    if (nonEmptyTiles === 0) {
      debugLog('GAME_BOARD', 'Board is empty, initializing');
      initializeBoard();
    }
  }, [board, initializeBoard]);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    // Increase the activation distance to make it more mobile-friendly
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    }
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: any) => {
    const { active } = event;
    const [row, col] = active.id.split('-').map(Number);
    setActiveTile({ row, col });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveTile(null);
      return;
    }

    const [activeRow, activeCol] = active.id.toString().split('-').map(Number);
    const [overRow, overCol] = over.id.toString().split('-').map(Number);

    const isAdjacent = 
      (Math.abs(activeCol - overCol) === 1 && activeRow === overRow) ||
      (Math.abs(activeRow - overRow) === 1 && activeCol === overCol);

    if (isAdjacent) {
      await swapTiles(activeRow, activeCol, overRow, overCol);
      //swapTiles will call processNewBoard

      // if (swapped) {
      //   await processNewBoard(board);
      // }
    }

    setActiveTile(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 bg-gray-800 rounded-lg">
        <GameBoardAnimations />
        <GameBoardGrid activeTile={activeTile} />
      </div>
      <DragOverlay>
        {activeTile && (
          <GameTile
            tile={board[activeTile.row][activeTile.col]}
            row={activeTile.row}
            col={activeTile.col}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}; 