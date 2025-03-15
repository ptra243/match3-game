import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../../store/gameStore';
import { Tile } from '../../store/types';
import { TileIcon } from './TileIcon';

interface GameTileProps {
  tile: Tile;
  row: number;
  col: number;
  isDragging?: boolean;
  isAiSelected?: boolean;
  onAnimationEnd?: (e: React.AnimationEvent) => void;
}

const colorClasses = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  black: 'bg-gray-900',
  empty: 'bg-transparent',
};

export const GameTile: React.FC<GameTileProps> = ({ 
  tile, 
  row, 
  col, 
  isDragging, 
  isAiSelected, 
  onAnimationEnd 
}) => {
  const { currentPlayer, selectedTile, human, selectTile, useSkill } = useGameStore();
  const isSkillReady = human.skill.isReady && currentPlayer === 'human' && human.skill.isSelected;
  const isBlackTile = tile.color === 'black';
  const isSelected = selectedTile?.row === row && selectedTile?.col === col;
  const isHumanTurn = currentPlayer === 'human';

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `${row}-${col}`,
    data: { row, col },
    disabled: !isHumanTurn || isSkillReady || tile.isAnimating,
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `${row}-${col}`,
    data: { row, col },
    disabled: !isHumanTurn || isSkillReady || tile.isAnimating,
  });

  const handleClick = () => {
    if (!isHumanTurn) return;
    if (isSkillReady && isBlackTile) {
      selectTile(row, col);
      useSkill(row, col);
    }
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      onClick={handleClick}
      {...attributes}
      {...listeners}
      className={`w-full h-full rounded-lg ${colorClasses[tile.color]} 
        flex items-center justify-center ${!isHumanTurn ? 'cursor-not-allowed' : (!isSkillReady || (isSkillReady && isBlackTile) ? 'cursor-move' : 'cursor-not-allowed')} shadow-md 
        hover:shadow-lg
        ${isDragging ? 'opacity-50 scale-105' : 'opacity-100 scale-100'}
        ${isAiSelected ? 'ring-4 ring-white ring-opacity-50 animate-pulse' : ''}
        ${tile.isMatched ? 'ring-4 ring-white ring-opacity-75 animate-[explode_0.5s_ease-out]' : ''}
        ${isSelected ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}
        ${tile.color === 'empty' ? 'pointer-events-none' : ''}
        ${isSkillReady && isBlackTile && isHumanTurn ? 'cursor-pointer hover:ring-4 hover:ring-yellow-400 hover:ring-opacity-50' : ''}
        ${tile.isAnimating ? 'animate-[fallIn_0.5s_ease-in-out]' : ''}
        transition-all duration-500`}
      onAnimationEnd={onAnimationEnd}
    >
      <TileIcon color={tile.color} />
    </div>
  );
}; 