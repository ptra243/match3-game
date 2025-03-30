import { StateCreator } from 'zustand';
import { GameState, Blessing, Effect, Color } from '../types';
import { getRandomBlessingsForColors } from '../blessings';
import { debugLog } from './debug';
import { toast } from 'react-hot-toast';


export interface BlessingSlice {
    availableBlessings: Blessing[];
    battleState: {
        currentBattle: number;
        maxBattles: number;
        blessingsCollected: Blessing[];
        playerWins: number;
        aiWins: number;
    };
    purchaseBlessing: (blessingId: string) => Promise<void>;
    convertBlessingsToItem: () => void;
}

export const createBlessingSlice: StateCreator<GameState, [], [], BlessingSlice> = (set, get) => ({
    availableBlessings: getRandomBlessingsForColors(),
    battleState: {
        currentBattle: 1,
        maxBattles: 5,
        blessingsCollected: [],
        playerWins: 0,
        aiWins: 0
    },

    purchaseBlessing: async (blessingId: string) => {
        const state = get();
        const player = state.currentPlayer;
        const blessing = state.availableBlessings.find((b: Blessing) => b.id === blessingId);

        if (!blessing) {
            debugLog('BLESSING', `Blessing ${blessingId} not found`);
            return;
        }

        // Check if player has enough resources
        const playerState = state[player];
        const hasEnoughResources = Object.entries(blessing.cost).every(([color, amount]) =>
            playerState.matchedColors[color as Color] >= (amount as number)
        );

        if (!hasEnoughResources) {
            toast.error('Not enough resources to purchase this blessing!');
            return;
        }

        // Deduct resources
        Object.entries(blessing.cost).forEach(([color, amount]) => {
            playerState.matchedColors[color as Color] -= (amount as number);
        });

        // Process each effect in the blessing
        blessing.effects.forEach((effect: Effect) => {
            // Apply immediate stat changes
            if (effect.colorStats) {
                set(state => {
                    const newColorStats = { ...state[player].colorStats };

                    Object.entries(effect.colorStats || {}).forEach(([color, value]) => {
                        if (value) {
                            newColorStats[color as Color] = (newColorStats[color as Color] || 0) + value;
                        }
                    });

                    return {
                        [player]: {
                            ...state[player],
                            colorStats: newColorStats
                        }
                    };
                });
            }

            if (effect.defense) {
                set(state => ({
                    [player]: {
                        ...state[player],
                        defense: state[player].defense + (effect.defense || 0)
                    }
                }));
            }

            if (effect.health) {
                set(state => {
                    const newHealth = Math.min(100 + (effect.health || 0), state[player].health + (effect.health || 0));
                    return {
                        [player]: {
                            ...state[player],
                            health: newHealth
                        }
                    };
                });
            }

            // Add as status effect if it has turns remaining
            if (effect.turnsRemaining) {
                set(state => ({
                    [player]: {
                        ...state[player],
                        statusEffects: [
                            ...state[player].statusEffects,
                            {
                                damageMultiplier: effect.damageMultiplier || 1,
                                resourceMultiplier: effect.resourceMultiplier || 1,
                                turnsRemaining: effect.turnsRemaining || 1,
                                extraTurn: effect.extraTurn || false,
                                manaConversion: effect.resourceConversion,
                                convertTiles: effect.convertTiles,
                                onExpire: effect.onExpire ? () => effect.onExpire!(get()) : undefined
                            }
                        ]
                    }
                }));
            }

            // Run the onActivate hook if this is an immediate effect
            if ((effect.triggerType === 'immediate' || !effect.triggerType) && effect.onActivate) {
                effect.onActivate(get());
            }
        });

        // If human player, add to collected blessings
        if (player === 'human') {
            set(state => ({
                battleState: {
                    ...state.battleState,
                    blessingsCollected: [...state.battleState.blessingsCollected, blessing]
                }
            }));
        }

        // Refresh available blessings
        set({
            availableBlessings: getRandomBlessingsForColors()
        });
        // process new board state
        await get().processNewBoard(get().board);
        // End turn after using a blessing
        get().switchPlayer();
    },

    convertBlessingsToItem: () => {
        const blessings = get().battleState.blessingsCollected;

        if (blessings.length < 3) {
            toast.error('You need at least 3 blessings to convert!');
            return;
        }

        // Just clear the blessings without creating an item
        set(state => ({
            battleState: {
                ...state.battleState,
                blessingsCollected: []
            }
        }));

        toast.success(`Cleared ${blessings.length} blessings!`);
    }
}); 