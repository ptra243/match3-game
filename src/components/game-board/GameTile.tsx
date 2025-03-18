import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../../store/gameStore';
import { Tile, Color } from '../../store/types';
import { TileIcon } from './TileIcon';
import { CLASSES } from '../../store/classes';
import { ALL_SKILLS } from '../../store/skills';
import { toast } from 'react-hot-toast';
import { debugLog } from '../../store/slices/debug';

interface GameTileProps {
  tile: Tile;
  row: number;
  col: number;
  isDragging?: boolean;
  isAiSelected?: boolean;
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
  isAiSelected
}) => {
  const { 
    currentPlayer, 
    selectedTile, 
    human, 
    selectTile, 
    useSkill, 
    updateTile,
    getCurrentAnimation,
    completeAnimation
  } = useGameStore();
    
  const activeSkill = human.activeSkillId !== null ? ALL_SKILLS[human.activeSkillId] : null;
  const isSkillActive = currentPlayer === 'human' && activeSkill !== null;
  const canTargetWithSkill = isSkillActive && (!activeSkill.targetColor || tile.color === activeSkill.targetColor);
  const isSelected = selectedTile?.row === row && selectedTile?.col === col;
  const isHumanTurn = currentPlayer === 'human';

  const tileId = `tile-${row}-${col}`;
  const currentAnimation = getCurrentAnimation(tileId);

  // Handle animation completion
  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (!currentAnimation) return;
    
    debugLog('GAME_TILE', `Animation ended for tile [${row},${col}]:`, {
      animationName: e.animationName,
      currentAnimation,
      tileState: tile
    });

    completeAnimation(currentAnimation.id);

    if (currentAnimation.type === 'explode') {
      updateTile(row, col, {
        color: 'empty',
        isMatched: false,
        isNew: false,
        isAnimating: true // Keep animating for the fall animation
      });
    } else if (currentAnimation.type === 'fallIn') {
      updateTile(row, col, {
        isAnimating: false,
        isNew: false
      });
    }
  };

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `${row}-${col}`,
    data: { row, col },
    disabled: !isHumanTurn || tile.isFrozen || (isSkillActive && !canTargetWithSkill) || currentAnimation?.type === 'fallIn',
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `${row}-${col}`,
    data: { row, col },
    disabled: !isHumanTurn || (isSkillActive && !canTargetWithSkill) || currentAnimation?.type === 'fallIn',
  });

  const handleClick = () => {
    if (!isHumanTurn || currentAnimation?.type === 'fallIn') return;
    
    selectTile(row, col);
    
    if (isSkillActive && activeSkill) {
      if (!activeSkill.targetColor || tile.color === activeSkill.targetColor) {
        useSkill(row, col);
      } else {
        toast.error(`This skill can only target ${activeSkill.targetColor} tiles!`);
      }
    }
  };

  // Determine animation classes
  const getAnimationClass = () => {
    if (!currentAnimation) return '';
    switch (currentAnimation.type) {
      case 'explode':
        return 'ring-4 ring-white ring-opacity-75 animate-explode';
      case 'fallIn':
        return 'animate-fallIn';
      default:
        return '';
    }
  };

  // Determine if tile should be visually empty (no color during animation)
  const shouldBeEmpty = () => {
    // Only be empty when tile color is empty and not animating
    return tile.color === 'empty' && !tile.isAnimating;
  };

  // Get the correct color to display for the tile icon
  const getDisplayColor = () => {
    // When falling in, use the animation metadata color if available
    if (currentAnimation?.type === 'fallIn' && currentAnimation.metadata?.color) {
      return currentAnimation.metadata.color as Color;
    }
    return tile.color;
  };

  return (
    <div
      id={tileId}
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      onClick={handleClick}
      {...attributes}
      {...listeners}
      className={`relative w-full h-full rounded-lg ${shouldBeEmpty() ? 'bg-transparent' : colorClasses[getDisplayColor()]} 
        flex items-center justify-center 
        ${!isHumanTurn || (tile.isFrozen && !isSkillActive) ? 'cursor-not-allowed' : (!isSkillActive || (isSkillActive && canTargetWithSkill) ? 'cursor-move' : 'cursor-not-allowed')} 
        shadow-md 
        hover:shadow-lg
        ${isDragging ? 'opacity-50 scale-105' : 'opacity-100 scale-100'}
        ${isAiSelected ? 'ring-4 ring-white ring-opacity-50 animate-pulse' : ''}
        ${getAnimationClass()}
        ${isSelected && !currentAnimation ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}
        ${shouldBeEmpty() ? 'opacity-0' : ''}
        ${isSkillActive && canTargetWithSkill && isHumanTurn && !currentAnimation ? 'cursor-pointer hover:ring-4 hover:ring-yellow-400 hover:ring-opacity-50' : ''}
        transition-all duration-300`}
      onAnimationEnd={handleAnimationEnd}
    >
      {!shouldBeEmpty() && <TileIcon color={getDisplayColor()} />}
      
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