import React, {useRef} from 'react';
import {motion, useAnimation} from 'framer-motion';

// Animation variants - Made more extreme for visibility


// Animation variants - Made more extreme for visibility
const animationVariants = {
    explode: {
        scale: [1, 1.5, 2, 2.5],
        opacity: [1, 0.7, 0.5, 0],
        transition: {
            duration: 0.3,
            ease: "easeInOut",
            times: [0, 0.3, 0.6, 1]
        }
    },
    fallIn: {
        y: [-100, -75, -50, 0],
        opacity: [0, 0.3, 0.7, 1],
        rotate: [10, 5, -5, 0],
        transition: {
            duration: 0.3,
            ease: "easeOut",
            times: [0, 0.3, 0.6, 1]
        }
    },
    idle: {
        scale: 1,
        opacity: 1,
        y: 0,
        rotate: 0,
        transition: {
            duration: 0.1
        }
    }
};
const TestTile = () => {
    const controls = useAnimation();
    const isAnimating = useRef(false);
    const handleVariantAnimation = (variant: keyof typeof animationVariants) => {
        if (isAnimating.current) return; // Prevent multiple clicks during animation
        isAnimating.current = true;

        // Start the animation using the variant
        controls.start(animationVariants[variant]).then(() => {
            // Reset animation state after completion
            isAnimating.current = false;

            // Reset to idle state after explode or fallIn
            if (variant !== 'idle') {
                controls.start(animationVariants.idle);
            }
        });
    };
    const handleClick = () => {
        if (isAnimating.current) return; // Prevent multiple clicks during animation
        isAnimating.current = true;

        // Start the explode animation
        controls.start({
            scale: [1, 1.5, 2, 2.5],
            opacity: [1, 0.7, 0.5, 0],
            transition: {
                duration: 0.3,
                ease: "easeInOut",
                times: [0, 0.3, 0.6, 1]
            }
        }).then(() => {
            // Reset animation state after completion
            isAnimating.current = false;
        });
    };

    return (
        <div className="flex flex-col items-center">
            <motion.div
                className="w-16 h-16 bg-red-500 flex items-center justify-center rounded-lg"
                animate={controls}
            >
                {/* You can add any content here, like an icon or text */}
                <span className="text-white">Tile</span>
            </motion.div>
            <button
                onClick={handleClick}
                className="mt-4 p-2 bg-blue-500 text-white rounded"
            >
                Trigger Explode Animation
            </button>
        </div>
    );
};

export default TestTile; 