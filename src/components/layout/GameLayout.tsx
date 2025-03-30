import React, {useEffect, useState} from 'react';
import {PlayerSidebar} from '../PlayerSidebar';
import {GameBoard} from '../game-board';
import BlessingPanel from '../BlessingPanel';
import {MobilePlayerIcon} from '../mobile/MobilePlayerIcon';
import {MobileBlessingPanel} from '../mobile/MobileBlessingPanel';

interface GameLayoutProps {
    onReset: () => void;
}

export const GameLayout: React.FC<GameLayoutProps> = ({onReset}) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Mobile layout with fixed position icons and stacked layout
    const MobileLayout = () => (
        <div className="flex flex-col items-center min-h-screen">
            <div className="fixed top-0 left-0 right-0 flex justify-between p-2 z-10">
                <MobilePlayerIcon player="human" position="left"/>
                <MobilePlayerIcon player="ai" position="right"/>
            </div>
            <div className="w-full max-w-[98vw] mt-16 flex flex-col gap-2">
                <GameBoard/>
                <MobileBlessingPanel/>
            </div>
        </div>
    );

    // Desktop layout with sidebars
    const DesktopLayout = () => (
        <div className="flex justify-center items-start">
            <PlayerSidebar player="human" position="left"/>
            <div className="flex flex-col mx-4 gap-2">
                <GameBoard/>
                <BlessingPanel/>
            </div>
            <PlayerSidebar player="ai" position="right"/>
        </div>
    );

    return isMobile ? <MobileLayout/> : <DesktopLayout/>;
}; 