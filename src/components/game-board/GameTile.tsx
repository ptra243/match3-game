import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../../store/gameStore';
import { Tile } from '../../store/types';
import { TileIcon } from './TileIcon';
import { CLASSES } from '../../store/classes';
import { ALL_SKILLS } from '../../store/skills';

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
  const { currentPlayer, selectedTile, human, selectTile, useSkill, updateTile } = useGameStore();
  const characterClass = CLASSES[human.className];
  const activeSkill = human.activeSkillId !== null ? ALL_SKILLS[human.activeSkillId] : null;
  const isSkillActive = currentPlayer === 'human' && activeSkill !== null;
  const canTargetWithSkill = isSkillActive && (!activeSkill.targetColor || tile.color === activeSkill.targetColor);
  const isSelected = selectedTile?.row === row && selectedTile?.col === col;
  const isHumanTurn = currentPlayer === 'human';

  // Track which animation is currently playing
  const [currentAnimation, setCurrentAnimation] = React.useState<'explode' | 'fallIn' | null>(
    tile.isMatched ? 'explode' : (tile.isAnimating ? 'fallIn' : null)
  );

  // Update animation state when tile props change
  React.useEffect(() => {
    if (tile.isMatched) {
      setCurrentAnimation('explode');
    } else if (tile.isAnimating && !tile.isMatched) {
      setCurrentAnimation('fallIn');
    }
  }, [tile.isMatched, tile.isAnimating]);

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    console.log(`Animation ended for tile [${row},${col}]: ${e.animationName}`, {
      currentAnimation,
      tileState: tile
    });
    
    if (e.animationName === 'explode') {
      // Update the tile to be empty and ready for falling
      updateTile(row, col, {
        color: 'empty',
        isMatched: false,
        isNew: false,
        isAnimating: true // Keep animating for the fall animation
      });
      setCurrentAnimation('fallIn');
    } else if (e.animationName === 'fallIn') {
      // Only clear animation state after fall is complete
      updateTile(row, col, {
        ...tile,
        isAnimating: false
      });
      setCurrentAnimation(null);
    }
    
    onAnimationEnd?.(e);
  };

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `${row}-${col}`,
    data: { row, col },
    disabled: !isHumanTurn || tile.isFrozen || (isSkillActive && !canTargetWithSkill) || currentAnimation !== null,
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `${row}-${col}`,
    data: { row, col },
    disabled: !isHumanTurn || (isSkillActive && !canTargetWithSkill) || currentAnimation !== null,
  });

  const handleClick = () => {
    if (!isHumanTurn) return;
    if (isSkillActive) {
      if (!activeSkill) return;
      
      // For non-targeted skills, we can use any tile
      if (!activeSkill.targetColor || tile.color === activeSkill.targetColor) {
        selectTile(row, col);
        useSkill(row, col);
      }
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
      className={`relative w-full h-full rounded-lg ${colorClasses[tile.color]} 
        flex items-center justify-center 
        ${!isHumanTurn || (tile.isFrozen && !isSkillActive) ? 'cursor-not-allowed' : (!isSkillActive || (isSkillActive && canTargetWithSkill) ? 'cursor-move' : 'cursor-not-allowed')} 
        shadow-md 
        hover:shadow-lg
        ${isDragging ? 'opacity-50 scale-105' : 'opacity-100 scale-100'}
        ${isAiSelected ? 'ring-4 ring-white ring-opacity-50 animate-pulse' : ''}
        ${currentAnimation === 'explode' ? 'ring-4 ring-white ring-opacity-75 animate-[explode_0.3s_ease-out]' : ''}
        ${isSelected ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}
        ${tile.color === 'empty' && !tile.isAnimating ? 'opacity-0' : ''}
        ${isSkillActive && canTargetWithSkill && isHumanTurn ? 'cursor-pointer hover:ring-4 hover:ring-yellow-400 hover:ring-opacity-50' : ''}
        ${currentAnimation === 'fallIn' ? 'animate-[fallIn_0.3s_ease-in-out]' : ''}
        transition-all duration-300`}
      onAnimationEnd={handleAnimationEnd}
    >
      <TileIcon color={tile.color} />
      
      {/* Frozen overlay */}
      {tile.isFrozen && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-30 rounded-lg">
          <div className="absolute top-0 right-0 p-1">
            <i className="ra ra-snowflake text-blue-200 text-lg" />
          </div>
        </div>
      )}

      {/* Ignited overlay */}
      {tile.isIgnited && (
        <div className="absolute inset-0 bg-red-500 bg-opacity-30 rounded-lg">
          <div className="absolute top-0 right-0 p-1">
            <i className="ra ra-flame text-red-200 text-lg" />
          </div>
        </div>
      )}
    </div>
  );
}; 