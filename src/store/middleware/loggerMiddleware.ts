import Dexie, { Table } from 'dexie';
import { StateCreator, StoreApi } from 'zustand';
import { GameState } from '../types';
import { produce } from 'immer';

// Define the database schema
class GameLoggerDB extends Dexie {
  stateChanges!: Table<{
    id?: number;
    timestamp: Date;
    actionType: string;
    previousState: string;
    changes: string;
    nextState: string;
    performanceMs: number;
  }>;
  errors!: Table<{
    id?: number;
    timestamp: Date;
    actionType: string;
    errorMessage: string;
    stackTrace: string;
  }>;
  debugLogs!: Table<{
    id?: number;
    timestamp: Date;
    key: string;
    message: string;
    data?: string;
  }>;

  constructor() {
    super('game-logs');
    this.version(2).stores({
      stateChanges: '++id, timestamp, actionType',
      errors: '++id, timestamp, actionType',
      debugLogs: '++id, timestamp, key'
    });
  }
}

// Initialize database
const db = new GameLoggerDB();

// Open database and handle errors
db.open().catch(err => {
  console.error('Failed to open database:', err);
});

interface LoggerConfig {
  enabled?: boolean;
  logStateChanges?: boolean;
  logErrors?: boolean;
}

// Helper function to safely serialize state
const serializeState = (state: any): string => {
  return JSON.stringify(state, (key, value) => {
    if (value instanceof Map) {
      return {
        _type: 'Map',
        value: Array.from(value.entries())
      };
    }
    if (value instanceof Set) {
      return {
        _type: 'Set',
        value: Array.from(value)
      };
    }
    return value;
  });
};

export const createLoggerMiddleware = <T extends GameState>(config: LoggerConfig = {}) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    logStateChanges = true,
    logErrors = true
  } = config;

  console.log('Logger middleware initialized with config:', { enabled, logStateChanges, logErrors });

  return (set: any, get: any, store: any) => {
    if (!enabled) {
      console.log('Logger middleware disabled');
      return store;
    }

    const originalSetState = store.setState;

    store.setState = (partial: any, replace?: boolean) => {
      const prevState = get();
      const startTime = performance.now();
      
      try {
        // Log the state change attempt
        console.log('Attempting to log state change:', {
          partial,
          replace,
          timestamp: new Date().toISOString(),
          dbReady: db.isOpen()
        });

        // Call the original setState directly to preserve Immer's draft state handling
        const result = originalSetState(partial, replace);
        const nextState = get();
        const endTime = performance.now();
        const performanceMs = endTime - startTime;

        if (logStateChanges) {
          // Use the safe serialization function
          const safePrevState = serializeState(prevState);
          const safePartial = serializeState(partial);
          const safeNextState = serializeState(nextState);

          // Log the attempt to write to database
          console.log('Writing state change to database:', {
            timestamp: new Date().toISOString(),
            performanceMs,
            dbReady: db.isOpen(),
            prevStateSize: safePrevState.length,
            changesSize: safePartial.length,
            nextStateSize: safeNextState.length
          });

          db.stateChanges.add({
            timestamp: new Date(),
            actionType: 'setState',
            previousState: safePrevState,
            changes: safePartial,
            nextState: safeNextState,
            performanceMs
          }).then(id => {
            console.log('State change logged successfully with ID:', id);
            // Verify the log was written
            db.stateChanges.get(id).then(log => {
              console.log('Verified log entry:', log);
            }).catch(err => {
              console.error('Failed to verify log entry:', err);
            });
          }).catch(err => {
            console.error('Failed to log state change:', err);
            // Log the error to the errors table
            db.errors.add({
              timestamp: new Date(),
              actionType: 'logStateChange',
              errorMessage: err.message,
              stackTrace: err.stack || 'No stack trace'
            }).catch(err => {
              console.error('Failed to log error to database:', err);
            });
          });
        }

        return result;
      } catch (error: unknown) {
        if (logErrors && error instanceof Error) {
          console.error('Error in state update:', error);
          
          db.errors.add({
            timestamp: new Date(),
            actionType: 'setState',
            errorMessage: error.message,
            stackTrace: error.stack || 'No stack trace'
          }).then(id => {
            console.log('Error logged successfully with ID:', id);
          }).catch(err => {
            console.error('Failed to log error:', err);
          });
        }
        throw error;
      }
    };

    return store;
  };
};

// Helper function to log debug messages
export const logDebugMessage = async (key: string, message: string, data?: any) => {
  try {
    await db.debugLogs.add({
      timestamp: new Date(),
      key,
      message,
      data: data ? JSON.stringify(data) : undefined
    });
  } catch (error) {
    console.error('Failed to log debug message:', error);
  }
};

// Helper functions to query the logs
export const queryLogs = {
  // Get all state changes for a specific action type
  getStateChangesByAction: async (actionType: string) => {
    try {
      console.log('Querying state changes for action:', actionType);
      const results = await db.stateChanges
        .where('actionType')
        .equals(actionType)
        .reverse()
        .toArray();
      console.log('Found state changes:', results);
      return results;
    } catch (error) {
      console.error('Failed to get state changes:', error);
      return [];
    }
  },

  // Get all errors
  getErrors: async () => {
    try {
      console.log('Querying all errors');
      const results = await db.errors
        .orderBy('timestamp')
        .reverse()
        .toArray();
      console.log('Found errors:', results);
      return results;
    } catch (error) {
      console.error('Failed to get errors:', error);
      return [];
    }
  },

  // Get recent state changes
  getRecentStateChanges: async (limit: number = 100) => {
    try {
      console.log('Querying recent state changes, limit:', limit);
      const results = await db.stateChanges
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
      console.log('Found recent state changes:', results);
      return results;
    } catch (error) {
      console.error('Failed to get recent state changes:', error);
      return [];
    }
  },

  // Get debug logs
  getDebugLogs: async (limit: number = 100) => {
    try {
      const results = await db.debugLogs
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
      return results;
    } catch (error) {
      console.error('Failed to get debug logs:', error);
      return [];
    }
  },

  // Clear all logs
  clearLogs: async () => {
    try {
      await Promise.all([
        db.stateChanges.clear(),
        db.errors.clear(),
        db.debugLogs.clear()
      ]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }
}; 