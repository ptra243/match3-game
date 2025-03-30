import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Item, Player, Effect, PlayerType } from '../store/types';
import { GameEventType } from '../store/slices/eventSlice';
import { Dialog } from '@headlessui/react';

interface InventoryPanelProps {
  player: PlayerType;
}

const RARITY_COLORS = {
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400'
};

const InventoryPanel: React.FC<InventoryPanelProps> = ({ player }) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const playerState = useGameStore(state => state[player]);
  const equipItem = useGameStore(state => state.equipItem);
  const unequipItem = useGameStore(state => state.unequipItem);
  const removeItemFromInventory = useGameStore(state => state.removeItemFromInventory);
  
  // Get equipped items and inventory
  const { equippedItems, inventory } = playerState;
  
  const handleEquipItem = (itemId: string) => {
    equipItem(player, itemId);
    setSelectedItem(null);
    setIsDetailsOpen(false);
  };
  
  const handleUnequipItem = (slot: 'weapon' | 'armor' | 'accessory' | 'trinket') => {
    unequipItem(player, slot);
    setSelectedItem(null);
    setIsDetailsOpen(false);
  };
  
  const handleRemoveItem = (itemId: string) => {
    removeItemFromInventory(player, itemId);
    setSelectedItem(null);
    setIsDetailsOpen(false);
  };
  
  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };
  
  // Group inventory items by slot
  const inventoryBySlot = inventory.reduce<Record<string, Item[]>>((acc, item) => {
    if (!acc[item.slot]) {
      acc[item.slot] = [];
    }
    acc[item.slot].push(item);
    return acc;
  }, {});
  
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
  const getEffectDescription = (effect: Effect): string[] => {
    const descriptions: string[] = [];
    
    if (effect.colorStats) {
      Object.entries(effect.colorStats).forEach(([color, value]) => {
        if (value) {
          descriptions.push(`+${value} ${color} damage`);
        }
      });
    }
    
    if (effect.defense) {
      descriptions.push(`+${effect.defense} defense`);
    }
    
    if (effect.health) {
      descriptions.push(`+${effect.health} health`);
    }
    
    if (effect.resourceBonus) {
      Object.entries(effect.resourceBonus).forEach(([color, value]) => {
        if (value) {
          descriptions.push(`+${value} ${color} resource gain`);
        }
      });
    }
    
    if (effect.damageMultiplier && effect.damageMultiplier !== 1) {
      const percent = Math.round((effect.damageMultiplier - 1) * 100);
      descriptions.push(`+${percent}% damage`);
    }
    
    if (effect.resourceMultiplier && effect.resourceMultiplier !== 1) {
      const percent = Math.round((effect.resourceMultiplier - 1) * 100);
      descriptions.push(`+${percent}% resources`);
    }
    
    if (effect.extraTurn) {
      descriptions.push("Gain an extra turn");
    }
    
    if (effect.resourceConversion) {
      descriptions.push(`Convert ${effect.resourceConversion.from} to ${effect.resourceConversion.to} at ${effect.resourceConversion.ratio}:1 ratio`);
    }
    
    if (effect.convertTiles) {
      descriptions.push(`Convert ${effect.convertTiles.count} tiles to ${effect.convertTiles.color}`);
    }
    
    return descriptions;
  };
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-white">
      <h2 className="text-xl mb-4 font-bold">{player === 'human' ? 'Your' : 'Enemy'} Equipment</h2>
      
      {/* Equipped Items Section */}
      <div className="mb-6">
        <h3 className="text-lg mb-2 border-b border-gray-700 pb-1">Equipped</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(equippedItems).map(([slot, item]) => (
            <div key={slot} className="border border-gray-700 rounded p-2 flex items-center">
              <div className="w-12 h-12 bg-gray-700 rounded-md mr-3 flex items-center justify-center">
                {item ? (
                  <span className={`text-2xl ${RARITY_COLORS[item.rarity]}`}>
                    {slot === 'weapon' ? '⚔️' : slot === 'armor' ? '🛡️' : slot === 'accessory' ? '💍' : '🔮'}
                  </span>
                ) : (
                  <span className="text-gray-500 text-2xl">➕</span>
                )}
              </div>
              <div className="flex-grow">
                <p className="font-medium">{slot.charAt(0).toUpperCase() + slot.slice(1)}</p>
                {item ? (
                  <button 
                    className={`text-sm ${RARITY_COLORS[item.rarity]} hover:underline`}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.name}
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">Empty</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Inventory Section */}
      <div>
        <h3 className="text-lg mb-2 border-b border-gray-700 pb-1">Inventory</h3>
        {inventory.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No items in inventory</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(inventoryBySlot).map(([slot, items]) => (
              <div key={slot}>
                <h4 className="text-md text-gray-300 mb-1">{slot.charAt(0).toUpperCase() + slot.slice(1)}s</h4>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(item => (
                    <button
                      key={item.id}
                      className={`text-left border border-gray-700 rounded p-2 hover:bg-gray-700 transition-colors ${
                        equippedItems[item.slot]?.id === item.id ? 'border-blue-500' : ''
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <p className={`font-medium ${RARITY_COLORS[item.rarity]}`}>{item.name}</p>
                      <p className="text-xs text-gray-400 truncate">{item.description.substring(0, 30)}...</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Item Details Dialog */}
      <Dialog
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-gray-800 border border-gray-700 rounded-lg p-5 max-w-md w-full mx-auto text-white">
            {selectedItem && (
              <>
                <Dialog.Title className={`text-xl font-bold ${RARITY_COLORS[selectedItem.rarity]}`}>
                  {selectedItem.name}
                </Dialog.Title>
                <div className="mt-2 space-y-3">
                  <p className="text-gray-300">{selectedItem.description}</p>
                  
                  <div className="bg-gray-700 p-3 rounded">
                    <p className="text-sm text-gray-300">
                      <span className="font-semibold">Type:</span> {selectedItem.slot.charAt(0).toUpperCase() + selectedItem.slot.slice(1)}
                    </p>
                    <p className="text-sm text-gray-300">
                      <span className="font-semibold">Rarity:</span> <span className={RARITY_COLORS[selectedItem.rarity]}>
                        {selectedItem.rarity.charAt(0).toUpperCase() + selectedItem.rarity.slice(1)}
                      </span>
                    </p>
                    
                    {/* Effects */}
                    {selectedItem.effects && selectedItem.effects.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold text-sm">Effects:</p>
                        {selectedItem.effects.map((effect, index) => (
                          <div key={index} className="mb-3 pl-2 border-l-2 border-gray-600 mt-1">
                            {/* Trigger type */}
                            {effect.triggerType && (
                              <p className="text-purple-300 text-xs font-medium">
                                {getTriggerText(effect.triggerType)}
                              </p>
                            )}
                            
                            {/* Effect descriptions */}
                            <ul className="text-sm space-y-1 mt-1">
                              {getEffectDescription(effect).map((desc, i) => (
                                <li key={i} className="text-blue-300">{desc}</li>
                              ))}
                            </ul>
                            
                            {/* Duration */}
                            {effect.turnsRemaining && (
                              <p className="text-yellow-300 text-xs mt-1">
                                Duration: {effect.turnsRemaining} turn{effect.turnsRemaining !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-5 flex space-x-2">
                  {equippedItems[selectedItem.slot]?.id === selectedItem.id ? (
                    <button
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors flex-1"
                      onClick={() => handleUnequipItem(selectedItem.slot)}
                    >
                      Unequip
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors flex-1"
                      onClick={() => handleEquipItem(selectedItem.id)}
                    >
                      Equip
                    </button>
                  )}
                  
                  <button
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
                    onClick={() => handleRemoveItem(selectedItem.id)}
                  >
                    Discard
                  </button>
                  
                  <button
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                    onClick={() => setIsDetailsOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default InventoryPanel; 