import React from 'react';
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { useGameStore } from '../../store/gameStore';
import { GameBoardAnimations } from './GameBoardAnimations';
import { GameBoardGrid } from './GameBoardGrid';
import { GameTile } from './GameTile';

export const GameBoard: React.FC = () => {
  const { board, swapTiles, checkMatches } = useGameStore();
  const [activeTile, setActiveTile] = React.useState<{ row: number; col: number } | null>(null);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  
  const sensors = useSensors(mouseSensor);

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
      const swapped = await swapTiles(activeRow, activeCol, overRow, overCol);
      if (swapped) {
        await checkMatches();
      }
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