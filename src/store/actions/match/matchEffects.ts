import { GameState, Color, Match, StatusEffect } from '../../types';
import { CLASSES } from '../../classes';
import { ALL_ITEMS } from '../../items';

export const calculateMatchResources = (state: GameState, match: Match): Record<Color, number> => {
  const resources: Record<Color, number> = {
    red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0
  };
  resources[match.color] = match.tiles.length;
  return resources;
};

export const applyMatchEffects = async (state: GameState, match: Match) => {
  const currentPlayer = state.currentPlayer;
  const player = state[currentPlayer];
  
  player.statusEffects.forEach(effect => {
    if (effect.resourceBonus && effect.resourceBonus.matchColor === match.color) {
      const { bonusColor, bonusAmount } = effect.resourceBonus;
      state[currentPlayer].matchedColors[bonusColor] = 
        (state[currentPlayer].matchedColors[bonusColor] || 0) + bonusAmount;
    }
  });
};

export const applyDamage = async (state: GameState, damage: number) => {
  const currentPlayer = state.currentPlayer;
  const opponent = currentPlayer === 'human' ? 'ai' : 'human';
  state.takeDamage(currentPlayer, opponent, damage, true);
};

export const distributeResources = async (state: GameState, resources: Record<Color, number>) => {
  const currentPlayer = state.currentPlayer;
  const player = state[currentPlayer];
  
  const resourceMultiplier = player.statusEffects.reduce(
    (multiplier, effect) => multiplier * (effect.resourceMultiplier || 1), 1
  );

  const conversionEffect = player.statusEffects.find(effect => effect.manaConversion);
  
  Object.entries(resources).forEach(([color, amount]) => {
    if (color !== 'empty') {
      const finalAmount = Math.round(amount * resourceMultiplier);
      const colorKey = color as Color;
      
      if (conversionEffect?.manaConversion && colorKey === conversionEffect.manaConversion.from) {
        const { to, ratio } = conversionEffect.manaConversion;
        const convertedAmount = Math.floor(finalAmount / ratio);
        const remainingAmount = finalAmount % ratio;
        
        state[currentPlayer].matchedColors[colorKey] = 
          (state[currentPlayer].matchedColors[colorKey] || 0) + remainingAmount;
        state[currentPlayer].matchedColors[to] = 
          (state[currentPlayer].matchedColors[to] || 0) + convertedAmount;
      } else {
        state[currentPlayer].matchedColors[colorKey] = 
          (state[currentPlayer].matchedColors[colorKey] || 0) + finalAmount;
      }
    }
  });
};

export const calculateMatchDamage = (state: GameState, match: Match): number => {
  const currentPlayer = state.currentPlayer;
  const color = match.color;
  const colorStat = state[currentPlayer].colorStats[color] || 0;
  const matchLength = match.tiles.length;

  let baseDamage = colorStat * Math.ceil(matchLength / 3);

  if (matchLength === 4) {
    baseDamage *= 1.5;
  } else if (matchLength >= 5) {
    baseDamage *= 2;
  }

  if (match.isSpecialShape) {
    baseDamage *= 1.5;
  }

  const comboCount = state.currentCombo;
  if (comboCount > 1) {
    baseDamage *= (1 + (comboCount - 1) * 0.5);
  }

  return Math.round(baseDamage);
};

export const checkItemReward = (state: GameState) => {
  if (Math.random() > 0.15) return;

  const humanClass = CLASSES[state.human.className];
  const aiClass = CLASSES[state.ai.className];
  const usedColors = [
    humanClass.primaryColor,
    humanClass.secondaryColor,
    aiClass.primaryColor,
    aiClass.secondaryColor
  ];

  const availableColors = ['red', 'blue', 'green', 'yellow', 'black'].filter(
    color => !usedColors.includes(color as Color)
  ) as Color[];

  const costColor = availableColors.length > 0
    ? availableColors[Math.floor(Math.random() * availableColors.length)]
    : ['red', 'blue', 'green', 'yellow', 'black'][Math.floor(Math.random() * 5)] as Color;

  const costAmount = Math.max(3, Math.min(8, state.currentCombo * 2));

  const commonItems = Object.values(ALL_ITEMS).filter(item => item.rarity === 'common');
  const uncommonItems = Object.values(ALL_ITEMS).filter(item => item.rarity === 'uncommon');
  const rareItems = Object.values(ALL_ITEMS).filter(item => item.rarity === 'rare');

  const options = [
    commonItems[Math.floor(Math.random() * commonItems.length)],
    uncommonItems[Math.floor(Math.random() * uncommonItems.length)],
    rareItems[Math.floor(Math.random() * rareItems.length)]
  ].map(item => item.id);

  state.setItemReward(options, {color: costColor, amount: costAmount});
}; 