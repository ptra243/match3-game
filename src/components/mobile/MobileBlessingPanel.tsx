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
        <div className={`p-2 rounded-lg border ${hasEnoughResources ? 'border-white' : 'border-gray-600'} bg-gray-700`}>
            <div className="flex items-center justify-between">
                <h4 className="text-white font-medium text-[10px] truncate mr-1">{blessing.name}</h4>
                <div className="flex items-center flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${COLOR_BACKGROUNDS[blessing.color]} mr-1`}></div>
                    <span className={`text-[10px] ${hasEnoughResources ? 'text-white' : 'text-red-400'}`}>
            {blessing.cost}
          </span>
                </div>
            </div>

            <button
                onClick={onPurchase}
                disabled={!hasEnoughResources}
                className={`w-full mt-1 py-0.5 px-2 rounded text-[10px] font-medium ${
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
            scrollContainerRef.current.scrollBy({left: -120, behavior: 'smooth'});
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({left: 120, behavior: 'smooth'});
        }
    };

    return (
        <div className="w-full bg-gray-800 border-t border-gray-700 p-2 rounded-b-lg">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-bold text-[10px]">Blessings</h3>
                <div className="flex items-center text-[10px] text-gray-300">
                    <span className="mr-1">Battle {battleState.currentBattle}/{battleState.maxBattles}</span>
                    <span className="mx-1">|</span>
                    <span className="mr-1">Collected: {battleState.blessingsCollected.length}</span>
                    {battleState.blessingsCollected.length >= 3 && (
                        <button
                            onClick={() => useGameStore.getState().convertBlessingsToItem()}
                            className="ml-1 px-1.5 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px]"
                        >
                            Convert
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable blessings with navigation arrows */}
            <div className="relative h-full">
                {/* Left scroll button */}
                <div className="absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-gray-800 to-transparent">
                    <button
                        onClick={scrollLeft}
                        className="w-full h-full flex items-center justify-start pl-1.5"
                        aria-label="Scroll left"
                    >
                        <span className="text-white font-bold text-xs">&lt;</span>
                    </button>
                </div>

                {/* Right scroll button */}
                <div className="absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-gray-800 to-transparent">
                    <button
                        onClick={scrollRight}
                        className="w-full h-full flex items-center justify-end pr-1.5"
                        aria-label="Scroll right"
                    >
                        <span className="text-white font-bold text-xs">&gt;</span>
                    </button>
                </div>

                {/* Scroll container with padding for buttons */}
                <div className="overflow-x-auto px-6 pb-1" ref={scrollContainerRef}>
                    <div className="flex space-x-2 py-1" style={{minWidth: 'max-content'}}>
                        {availableBlessings.map((blessing) => {
                            const hasEnoughResources = playerResources[blessing.color] >= blessing.cost;

                            return (
                                <div key={blessing.id} className="w-28">
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