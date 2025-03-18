import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Dialog } from '@headlessui/react';
import { ALL_ITEMS } from '../store/items';
import { Color, Effect } from '../store/types';
import { GameEventType } from '../store/slices/eventSlice';

const RARITY_COLORS = {
  common: 'text-gray-300 border-gray-300',
  uncommon: 'text-green-400 border-green-400',
  rare: 'text-blue-400 border-blue-400',
  epic: 'text-purple-400 border-purple-400',
  legendary: 'text-orange-400 border-orange-400'
};

const COLOR_BACKGROUNDS = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  black: 'bg-gray-800',
  empty: 'bg-gray-500'
};

const ItemRewardModal: React.FC = () => {
  const showItemReward = useGameStore(state => state.showItemReward);
  const itemRewardOptions = useGameStore(state => state.itemRewardOptions);
  const itemRewardCost = useGameStore(state => state.itemRewardCost);
  const selectItemReward = useGameStore(state => state.selectItemReward);
  const clearItemReward = useGameStore(state => state.clearItemReward);
  const currentPlayer = useGameStore(state => state.currentPlayer);
  const playerResources = useGameStore(state => state[currentPlayer].matchedColors);
  
  if (!showItemReward) return null;
  
  const hasEnoughResources = playerResources[itemRewardCost.color] >= itemRewardCost.amount;
  
  const formatItemName = (itemId: string) => {
    return itemId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  
  // Helper function to format trigger types for display
  const getTriggerText = (triggerType?: 'immediate' | GameEventType): string => {
    if (!triggerType || triggerType === 'immediate') return "Immediate";
    
    switch(triggerType) {
      case 'OnDamageTaken': return "On Damage Taken";
      case 'OnDamageDealt': return "On Damage Dealt";
      case 'StartOfTurn': return "Start of Turn";
      case 'EndOfTurn': return "End of Turn";
      case 'OnMatch': return "On Match";
      case 'OnSkillCast': return "On Skill Cast";
      case 'OnResourceGained': return "On Resource Gained";
      case 'OnStatusEffectApplied': return "On Status Effect Applied";
      case 'OnGameOver': return "On Game Over";
      default: return triggerType;
    }
  };
  
  // Helper function to describe effects
  const getEffectSummary = (effect: Effect): string => {
    const parts: string[] = [];
    
    if (effect.colorStats) {
      Object.entries(effect.colorStats).forEach(([color, value]) => {
        if (value) {
          parts.push(`+${value} ${color} damage`);
        }
      });
    }
    
    if (effect.defense) {
      parts.push(`+${effect.defense} defense`);
    }
    
    if (effect.health) {
      parts.push(`+${effect.health} health`);
    }
    
    if (effect.damageMultiplier && effect.damageMultiplier !== 1) {
      const percent = Math.round((effect.damageMultiplier - 1) * 100);
      parts.push(`+${percent}% damage`);
    }
    
    if (effect.resourceMultiplier && effect.resourceMultiplier !== 1) {
      const percent = Math.round((effect.resourceMultiplier - 1) * 100);
      parts.push(`+${percent}% resources`);
    }
    
    if (effect.extraTurn) {
      parts.push("extra turn");
    }
    
    return parts.join(', ');
  };
  
  return (
    <Dialog
      open={showItemReward}
      onClose={() => clearItemReward()}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-800 border border-gray-700 rounded-lg p-5 max-w-xl w-full mx-auto text-white">
          <Dialog.Title className="text-xl font-bold text-center mb-4">
            Choose Your Reward
          </Dialog.Title>
          
          <div className="mb-4 flex justify-center items-center">
            <span className="mr-2">Cost:</span>
            <div className={`w-6 h-6 rounded-full ${COLOR_BACKGROUNDS[itemRewardCost.color]} mr-2`}></div>
            <span className={hasEnoughResources ? 'text-green-400' : 'text-red-400'}>
              {itemRewardCost.amount} {itemRewardCost.color} {hasEnoughResources ? '(Available)' : '(Not enough)'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {itemRewardOptions.map(itemId => {
              const item = ALL_ITEMS[itemId];
              if (!item) return null;
              
              return (
                <div 
                  key={itemId}
                  className={`border-2 ${RARITY_COLORS[item.rarity]} bg-gray-700 rounded-lg p-4 flex flex-col`}
                >
                  <h3 className={`text-lg font-bold ${RARITY_COLORS[item.rarity].split(' ')[0]}`}>
                    {formatItemName(item.id)}
                  </h3>
                  <p className="text-sm text-gray-300 my-2">{item.description}</p>
                  
                  <div className="text-xs mt-2 flex-grow">
                    <div className="mb-1">
                      <span className="font-semibold">Type:</span> {item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Rarity:</span> {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                    </div>
                    
                    {item.effects && item.effects.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <span className="font-semibold">Effects:</span>
                        {item.effects.map((effect, index) => (
                          <div key={index} className="pl-2 border-l-2 border-gray-600 mt-1">
                            {effect.triggerType && effect.triggerType !== 'immediate' && (
                              <div className="text-purple-300 text-xs">
                                {getTriggerText(effect.triggerType)}
                              </div>
                            )}
                            <div className="text-blue-300 text-xs">
                              {getEffectSummary(effect)}
                            </div>
                            {effect.turnsRemaining && (
                              <div className="text-yellow-300 text-xs">
                                ({effect.turnsRemaining} turn{effect.turnsRemaining !== 1 ? 's' : ''})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => selectItemReward(itemId)}
                    disabled={!hasEnoughResources}
                    className={`mt-3 py-2 px-4 rounded-lg font-medium transition-colors ${
                      hasEnoughResources 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Select
                  </button>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => clearItemReward()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              Skip
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ItemRewardModal; 