import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useGameStore } from '../../store/gameStore';
import { Tile } from '../../store/types';
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
  const [currentAnimation, setCurrentAnimation] = React.useState<'explode' | 'fallIn' | null>(null);
  const animationStateRef = React.useRef({ isProcessing: false });

  // Log initial state for selected tile
  React.useEffect(() => {
    if (isSelected) {
      debugLog('GAME_TILE', `Selected tile [${row},${col}] state:`, {
        tile,
        isMatched: tile.isMatched,
        isAnimating: tile.isAnimating,
        currentAnimation,
        isSelected,
        isSkillActive
      });
    }
  }, [isSelected, tile, row, col, currentAnimation, isSkillActive]);

  // Update animation state when tile props change
  React.useEffect(() => {
    if (isSelected) {
      debugLog('GAME_TILE', `Animation update check for selected tile [${row},${col}]:`, {
        isMatched: tile.isMatched,
        isAnimating: tile.isAnimating,
        currentAnimation,
        isProcessing: animationStateRef.current.isProcessing,
        shouldExplode: tile.isMatched && !currentAnimation && !animationStateRef.current.isProcessing,
        shouldFall: tile.isAnimating && !tile.isMatched && !currentAnimation && !animationStateRef.current.isProcessing
      });
    }

    // Only start new animations if we're not currently processing one
    if (!animationStateRef.current.isProcessing) {
      if (tile.isMatched && !currentAnimation) {
        debugLog('GAME_TILE', `Setting explode animation for tile [${row},${col}]`);
        animationStateRef.current.isProcessing = true;
        setCurrentAnimation('explode');
        if (isSelected) {
          selectTile(-1, -1); // Unselect the tile by setting invalid coordinates
        }
      } else if (tile.isAnimating && !tile.isMatched && !currentAnimation) {
        debugLog('GAME_TILE', `Setting fallIn animation for tile [${row},${col}]`);
        animationStateRef.current.isProcessing = true;
        setCurrentAnimation('fallIn');
      }
    }
  }, [tile.isMatched, tile.isAnimating, currentAnimation, row, col, isSelected]);

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    debugLog('GAME_TILE', `Animation ended for tile [${row},${col}]:`, {
      animationName: e.animationName,
      currentAnimation,
      tileState: tile,
      isSelected,
      isMatched: tile.isMatched,
      isAnimating: tile.isAnimating,
      isProcessing: animationStateRef.current.isProcessing
    });
    
    if (e.animationName === 'explode' && currentAnimation === 'explode') {
      debugLog('GAME_TILE', `Processing explode animation end for tile [${row},${col}]`);
      setCurrentAnimation(null);
      animationStateRef.current.isProcessing = false;
      
      // Update the tile to be empty and ready for falling
      updateTile(row, col, {
        color: 'empty',
        isMatched: false,
        isNew: false,
        isAnimating: true // Keep animating for the fall animation
      });
    } else if (e.animationName === 'fallIn' && currentAnimation === 'fallIn') {
      debugLog('GAME_TILE', `Processing fallIn animation end for tile [${row},${col}]`);
      setCurrentAnimation(null);
      animationStateRef.current.isProcessing = false;
      
      // Update the tile state
      updateTile(row, col, {
        isAnimating: false,
        isNew: false
      });
    }
    
    onAnimationEnd?.(e);
  };

  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `${row}-${col}`,
    data: { row, col },
    disabled: !isHumanTurn || tile.isFrozen || (isSkillActive && !canTargetWithSkill) || currentAnimation === 'fallIn',
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `${row}-${col}`,
    data: { row, col },
    disabled: !isHumanTurn || (isSkillActive && !canTargetWithSkill) || currentAnimation === 'fallIn',
  });

  const handleClick = () => {
    if (!isHumanTurn || currentAnimation === 'fallIn') return;
    
    // Always select the tile first
    selectTile(row, col);
    
    // If a skill is active, check if we can use it on this tile
    if (isSkillActive && activeSkill) {
      // For non-targeted skills or matching target color
      if (!activeSkill.targetColor || tile.color === activeSkill.targetColor) {
        useSkill(row, col);
      } else {
        toast.error(`This skill can only target ${activeSkill.targetColor} tiles!`);
      }
    }
  };

  // Determine if this tile should show selection during animation
  const showSelectionDuringAnimation = isSelected && isSkillActive && currentAnimation === 'explode';

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
        ${(isSelected && !currentAnimation) || showSelectionDuringAnimation ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}
        ${tile.color === 'empty' && !tile.isAnimating ? 'opacity-0' : ''}
        ${isSkillActive && canTargetWithSkill && isHumanTurn && !currentAnimation ? 'cursor-pointer hover:ring-4 hover:ring-yellow-400 hover:ring-opacity-50' : ''}
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