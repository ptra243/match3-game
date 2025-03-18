export function debugLog(key: string, message: string, data?: any) {

  if (key in DEBUG_KEYS && DEBUG_KEYS[key as keyof typeof DEBUG_KEYS]) {
    console.log(`${key}: ${message}`, data);
  }
}

export const DEBUG_KEYS = {
    'MATCH_SLICE': false,
    'BOARD_SLICE': false,
    'PLAYER_SLICE': false,
    'GAME_FLOW': false,
    'GAME_RULES': false,
    'GAME_CONSTANTS': false,
    'SKILL_SLICE': false,
    'GAME_BOARD': false,
    'GAME_TILE': false,
} as const;
    
