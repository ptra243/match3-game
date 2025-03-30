import { logDebugMessage } from '../middleware/loggerMiddleware';

export function debugLog(key: string, message: string, data?: any) {
  // Always log to database
  logDebugMessage(key, message, data);

  // Only log to console if the key is enabled
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
    'ANIMATION': false,
} as const;
    
