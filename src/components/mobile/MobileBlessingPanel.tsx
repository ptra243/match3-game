import React, {useRef} from 'react';
import {useGameStore} from '../../store/gameStore';
import {Blessing} from '../../store/types';

const COLOR_BACKGROUNDS = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    black: 'bg-gray-800',
    empty: 'bg-gray-500'
};

const MobileBlessingCard: React.FC<{
    blessing: Blessing,
    hasEnoughResources: boolean,
    onPurchase: () => void
}> = ({blessing, hasEnoughResources, onPurchase}) => {
    return (
        <div className={`p-1 rounded-lg border ${hasEnoughResources ? 'border-white' : 'border-gray-600'} bg-gray-700`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${COLOR_BACKGROUNDS[blessing.color]} mr-1 flex-shrink-0`}></div>
                    <h4 className="text-white font-medium text-[10px] truncate">{blessing.name}</h4>
                </div>
                <span className={`text-[10px] ml-1 flex-shrink-0 ${hasEnoughResources ? 'text-white' : 'text-red-400'}`}>
                    {blessing.cost}
                </span>
            </div>

            <button
                onClick={onPurchase}
                disabled={!hasEnoughResources}
                className={`w-full mt-0.5 py-0.5 px-1 rounded text-[10px] font-medium ${
                    hasEnoughResources
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
            >
                Purchase
            </button>
        </div>
    );
};

export const MobileBlessingPanel: React.FC = () => {
    const availableBlessings = useGameStore(state => state.availableBlessings);
    const purchaseBlessing = useGameStore(state => state.purchaseBlessing);
    const currentPlayer = useGameStore(state => state.currentPlayer);
    const playerResources = useGameStore(state => state[currentPlayer].matchedColors);
    const battleState = useGameStore(state => state.battleState);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Only show for human player
    if (currentPlayer !== 'human') return null;

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({left: -100, behavior: 'smooth'});
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({left: 100, behavior: 'smooth'});
        }
    };

    return (
        <div className="w-full bg-gray-800 border-t border-gray-700 p-1">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-white font-bold text-[10px]">Blessings</h3>
                <div className="flex items-center text-[10px] text-gray-300">
                    <span className="mr-1">Battle {battleState.currentBattle}/{battleState.maxBattles}</span>
                    <span className="mx-0.5">|</span>
                    <span className="mr-1">Collected: {battleState.blessingsCollected.length}</span>
                    {battleState.blessingsCollected.length >= 3 && (
                        <button
                            onClick={() => useGameStore.getState().convertBlessingsToItem()}
                            className="ml-1 px-1 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px]"
                        >
                            Convert
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable blessings with navigation arrows */}
            <div className="relative h-16">
                {/* Left scroll button */}
                <div className="absolute left-0 top-0 bottom-0 w-4 z-10 bg-gradient-to-r from-gray-800 to-transparent">
                    <button
                        onClick={scrollLeft}
                        className="w-full h-full flex items-center justify-start pl-0.5"
                        aria-label="Scroll left"
                    >
                        <span className="text-white font-bold text-xs">&lt;</span>
                    </button>
                </div>

                {/* Right scroll button */}
                <div className="absolute right-0 top-0 bottom-0 w-4 z-10 bg-gradient-to-l from-gray-800 to-transparent">
                    <button
                        onClick={scrollRight}
                        className="w-full h-full flex items-center justify-end pr-0.5"
                        aria-label="Scroll right"
                    >
                        <span className="text-white font-bold text-xs">&gt;</span>
                    </button>
                </div>

                {/* Scroll container with padding for buttons */}
                <div className="overflow-x-auto px-4" ref={scrollContainerRef}>
                    <div className="flex space-x-1 py-0.5" style={{minWidth: 'max-content'}}>
                        {availableBlessings.map((blessing) => {
                            const hasEnoughResources = playerResources[blessing.color] >= blessing.cost;

                            return (
                                <div key={blessing.id} className="w-20">
                                    <MobileBlessingCard
                                        blessing={blessing}
                                        hasEnoughResources={hasEnoughResources}
                                        onPurchase={() => purchaseBlessing(blessing.id)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}; 