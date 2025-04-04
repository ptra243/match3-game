import { StateCreator } from 'zustand';
import { GameState, Color } from '../types';
import { debugLog } from './debug';

// Define event types
export type GameEventType = 
  | 'OnDamageDealt' 
  | 'OnDamageTaken' 
  | 'StartOfTurn' 
  | 'EndOfTurn'
  | 'OnMatch'
  | 'OnSkillCast'
  | 'OnResourceGained'
  | 'OnStatusEffectApplied'
  | 'OnGameOver';

// Define event payloads
export interface DamageEventPayload {
  amount: number;
  source: 'human' | 'ai';
  target: 'human' | 'ai';
  damageType?: 'normal' | 'special' | 'crit' | 'indirect' | 'skill';
}

export interface TurnEventPayload {
  player: 'human' | 'ai';
  turnNumber: number;
}

export interface MatchEventPayload {
  tiles: { row: number; col: number; color: Color }[];
  colors: Record<Color, number>;
  player: 'human' | 'ai';
  isSpecialShape?: boolean;
}

export interface SkillCastEventPayload {
  skillId: string;
  player: 'human' | 'ai';
  targetTile?: { row: number; col: number };
}

export interface ResourceGainedEventPayload {
  resource: Color;
  amount: number;
  player: 'human' | 'ai';
  source: 'match' | 'skill' | 'statusEffect';
}

export interface StatusEffectEventPayload {
  effectType: string;
  player: 'human' | 'ai';
  duration: number;
  strength: number;
}

export interface GameOverEventPayload {
  winner: 'human' | 'ai';
  reason: 'health' | 'noMoves' | 'surrender';
}

export type GameEventPayload = 
  | DamageEventPayload 
  | TurnEventPayload 
  | MatchEventPayload
  | SkillCastEventPayload
  | ResourceGainedEventPayload
  | StatusEffectEventPayload
  | GameOverEventPayload;

export type EventHandler = (event: GameEventPayload) => void;

export type EventMiddleware = (
  next: EventHandler,
  event: GameEventPayload
) => void;

export interface EventSlice {
  eventState: {
    events: Map<GameEventType, Set<EventHandler>>;
    middleware: EventMiddleware[];
  };
  
  // Event registration
  on: (eventType: GameEventType, handler: EventHandler) => () => void;
  off: (eventType: GameEventType, handler: EventHandler) => void;
  
  // Middleware
  addMiddleware: (middleware: EventMiddleware) => () => void;
  
  // Event emission
  emit: (eventType: GameEventType, payload: GameEventPayload) => void;
}

export const createEventSlice: StateCreator<GameState, [], [], EventSlice> = (set, get) => {
  return {
    eventState: {
      events: new Map<GameEventType, Set<EventHandler>>(),
      middleware: []
    },
    
    on: (eventType, handler) => {
      set((state) => {
        // Create new Map for events
        const newEvents = new Map(state.eventState.events);
        if (!newEvents.has(eventType)) {
          newEvents.set(eventType, new Set());
        }
        
        const handlers = newEvents.get(eventType)!;
        handlers.add(handler);
        
        // Update the event state with new Map
        state.eventState = {
          ...state.eventState,
          events: newEvents
        };
        
        debugLog('EVENT_SLICE', `Registered handler for ${eventType}`);
        return state;
      });
      
      // Return function to unsubscribe
      return () => get().off(eventType, handler);
    },
    
    off: (eventType, handler) => {
      set((state) => {
        // Create new Map for events
        const newEvents = new Map(state.eventState.events);
        if (newEvents.has(eventType)) {
          const handlers = newEvents.get(eventType)!;
          handlers.delete(handler);
          
          debugLog('EVENT_SLICE', `Unregistered handler for ${eventType}`);
          
          if (handlers.size === 0) {
            newEvents.delete(eventType);
          }
        }

        // Update the event state with new Map
        state.eventState = {
          ...state.eventState,
          events: newEvents
        };
        return state;
      });
    },
    
    addMiddleware: (middleware) => {
      set((state) => {
        // Create new array for middleware
        const newMiddleware = [...state.eventState.middleware, middleware];
        
        // Update the event state with new middleware array
        state.eventState = {
          ...state.eventState,
          middleware: newMiddleware
        };
        
        debugLog('EVENT_SLICE', 'Added event middleware');
        return state;
      });
      
      // Return function to remove middleware
      return () => {
        set((state) => {
          // Create new array for middleware
          const newMiddleware = state.eventState.middleware.filter(m => m !== middleware);
          
          // Update the event state with new middleware array
          state.eventState = {
            ...state.eventState,
            middleware: newMiddleware
          };
          
          debugLog('EVENT_SLICE', 'Removed event middleware');
          return state;
        });
      };
    },
    
    emit: (eventType, payload) => {
      debugLog('EVENT_SLICE', `Emitting event: ${eventType}`, payload);
      
      const events = get().eventState.events;
      if (!events.has(eventType)) {
        return; // No handlers for this event type
      }
      
      const handlers = events.get(eventType)!;
      const middleware = get().eventState.middleware;
      
      // Apply middleware chain
      const runEvent = (handler: EventHandler, event: GameEventPayload) => {
        // Create middleware chain
        const chain = middleware.reduceRight(
          (next, middleware) => (event) => middleware(next, event),
          handler
        );
        
        // Execute chain
        chain(event);
      };
      
      // Pass event through middleware chain to each handler
      handlers.forEach(handler => {
        runEvent(handler, payload);
      });
    }
  };
}; 