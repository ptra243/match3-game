import React from 'react';

export const GameBoardAnimations: React.FC = () => {
  return (
    <style>
      {`
        @keyframes explode {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.5;
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }
        @keyframes fallIn {
          0% {
            transform: translateY(-50px);
          }
          50% {
            transform: translateY(-25px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}
    </style>
  );
}; 