import { StateCreator } from 'zustand';
import { GameState, AnimationType, AnimationInfo, AnimationSequence } from '../types';
import { debugLog } from './debug';

export interface AnimationSlice {
  animationState: {
    activeAnimations: Map<string, AnimationInfo>;
    sequences: Map<string, AnimationSequence>;
  };
  
  // Animation Registration
  registerAnimation: (type: AnimationType, elementIds: string[], metadata?: Record<string, any>) => string;
  startAnimation: (id: string) => void;
  completeAnimation: (id: string) => void;
  failAnimation: (id: string, error: Error) => void;
  
  // Sequence Management
  createSequence: (config: {
    id: string;
    animations: { type: AnimationType; elementIds: string[]; metadata?: Record<string, any>; }[];
    onComplete?: () => void;
    onError?: (error: Error) => void;
  }) => void;
  startSequence: (id: string) => Promise<void>;
  cancelSequence: (id: string) => void;
  
  // Utility Functions
  isAnimating: (elementId: string) => boolean;
  getCurrentAnimation: (elementId: string) => AnimationInfo | undefined;
  waitForAnimation: (id: string) => Promise<void>;
  waitForSequence: (id: string) => Promise<void>;
  waitForAllAnimations: () => Promise<void>;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const createAnimationSlice: StateCreator<GameState, [], [], AnimationSlice> = (set, get) => {
  // Create an object for internal slice access that doesn't need to reference get().animations
  const sliceInternals = {
    registerAnimation: (type: AnimationType, elementIds: string[], metadata?: Record<string, any>) => {
      const id = generateId();
      debugLog('ANIMATION', `Registering animation ${type}`, { id, elementIds, metadata });
      
      // Create the animation info
      const animationInfo: AnimationInfo = {
        id,
        type,
        status: 'pending' as const,
        elementIds,
        startTime: Date.now(),
        duration: type === 'explode' ? 300 : type === 'fallIn' ? 300 : 200,
        metadata
      };

      // Register the animation
      set((state) => {
        // Use Immer's draft state to modify the Map
        state.animationState.activeAnimations.set(id, animationInfo);
        return state;
      });
      
      return id;
    },

    waitForAnimation: (id: string) => {
      return new Promise<void>((resolve, reject) => {
        const checkStatus = () => {
          const animation = get().animationState.activeAnimations.get(id);
          if (!animation) {
            reject(new Error('Animation not found'));
            return;
          }

          if (animation.status === 'completed') {
            resolve();
          } else if (animation.status === 'failed') {
            reject(new Error('Animation failed'));
          } else {
            setTimeout(checkStatus, 50);
          }
        };
        checkStatus();
      });
    },
    
    startAnimation: (id: string) => {
      debugLog('ANIMATION', `Starting animation ${id}`);
      
      // Get the current state to check if animation exists
      const animation = get().animationState.activeAnimations.get(id);
      if (!animation) {
        debugLog('ANIMATION', `No animation found for id ${id}`);
        return;
      }

      set((state) => {
        // Use Immer's draft state to modify the Map
        state.animationState.activeAnimations.set(id, {
          ...animation,
          status: 'running',
          startTime: Date.now()
        });
        return state;
      });
    },
    
    failAnimation: (id: string, error: Error) => {
      debugLog('ANIMATION', `Animation ${id} failed`, error);
      const animation = get().animationState.activeAnimations.get(id);
      if (!animation) return;

      set((state) => {
        // Use Immer's draft state to modify the Map
        state.animationState.activeAnimations.set(id, {
          ...animation,
          status: 'failed'
        });
        return state;
      });
    }
  };

  return {
    // Initialize Maps in the slice
    animationState: {
      activeAnimations: new Map<string, AnimationInfo>(),
      sequences: new Map<string, AnimationSequence>()
    },

    registerAnimation: sliceInternals.registerAnimation,
    startAnimation: sliceInternals.startAnimation,

    completeAnimation: (id) => {
      debugLog('ANIMATION', `Completing animation ${id}`);
      const animation = get().animationState.activeAnimations.get(id);
      if (!animation) return;

      set((state) => {
        // Create new Map with updated animation
        const newActiveAnimations = new Map(state.animationState.activeAnimations);
        newActiveAnimations.set(id, {
          ...animation,
          status: 'completed'
        });

        // Create new Map for sequences
        const newSequences = new Map(state.animationState.sequences);

        // Check if this animation is part of a sequence
        state.animationState.sequences.forEach((sequence, sequenceId) => {
          if (sequence.animations.find((a) => a.id === id)) {
            const allCompleted = sequence.animations.every(
              (a) => state.animationState.activeAnimations.get(a.id)?.status === 'completed'
            );
            if (allCompleted) {
              sequence.onComplete?.();
              newSequences.delete(sequenceId);
            }
          }
        });

        // Update the animation state with new Maps
        state.animationState = {
          activeAnimations: newActiveAnimations,
          sequences: newSequences
        };
        return state;
      });
    },

    failAnimation: sliceInternals.failAnimation,

    createSequence: ({ id, animations, onComplete, onError }) => {
      debugLog('ANIMATION', `Creating animation sequence ${id}`, { animations });
      const animationInfos = animations.map(anim => ({
        ...get().animationState.activeAnimations.get(sliceInternals.registerAnimation(anim.type, anim.elementIds, anim.metadata))!
      }));

      set((state) => {
        // Create new Map for sequences
        const newSequences = new Map(state.animationState.sequences);
        newSequences.set(id, {
          id,
          animations: animationInfos,
          status: 'pending',
          onComplete,
          onError
        });

        // Update the animation state with new Map
        state.animationState = {
          ...state.animationState,
          sequences: newSequences
        };
        return state;
      });
    },

    startSequence: async (id) => {
      const sequence = get().animationState.sequences.get(id);
      if (!sequence) return;

      debugLog('ANIMATION', `Starting animation sequence ${id}`);
      
      try {
        for (const animation of sequence.animations) {
          sliceInternals.startAnimation(animation.id);
          await sliceInternals.waitForAnimation(animation.id);
        }
        sequence.onComplete?.();
      } catch (error) {
        sequence.onError?.(error as Error);
      } finally {
        set((state) => {
          // Use Immer's draft state to modify the Map
          state.animationState.sequences.delete(id);
          return state;
        });
      }
    },

    cancelSequence: (id) => {
      debugLog('ANIMATION', `Cancelling animation sequence ${id}`);
      const sequence = get().animationState.sequences.get(id);
      if (!sequence) return;

      sequence.animations.forEach((animation) => {
        if (animation.status === 'running') {
          sliceInternals.failAnimation(animation.id, new Error('Sequence cancelled'));
        }
      });

      set((state) => {
        // Use Immer's draft state to modify the Map
        state.animationState.sequences.delete(id);
        return state;
      });
    },

    isAnimating: (elementId) => {
      return Array.from(get().animationState.activeAnimations.values()).some(
        animation => 
          animation.status === 'running' && 
          animation.elementIds.includes(elementId)
      );
    },

    getCurrentAnimation: (elementId) => {
      return Array.from(get().animationState.activeAnimations.values()).find(
        animation => 
          animation.status === 'running' && 
          animation.elementIds.includes(elementId)
      );
    },

    waitForAnimation: sliceInternals.waitForAnimation,

    waitForSequence: (id) => {
      return new Promise<void>((resolve, reject) => {
        const sequence = get().animationState.sequences.get(id);
        if (!sequence) {
          reject(new Error('Sequence not found'));
          return;
        }

        const checkStatus = () => {
          const allCompleted = sequence.animations.every(
            (a) => get().animationState.activeAnimations.get(a.id)?.status === 'completed'
          );
          if (allCompleted) {
            resolve();
          } else {
            setTimeout(checkStatus, 50);
          }
        };
        checkStatus();
      });
    },

    waitForAllAnimations: async () => {
      const runningAnimations = Array.from(get().animationState.activeAnimations.entries())
        .filter(([_, anim]) => anim.status === 'running')
        .map(([id]) => id);
      
      if (runningAnimations.length > 0) {
        debugLog('ANIMATION', `Waiting for ${runningAnimations.length} running animations to complete`);
        await Promise.all(runningAnimations.map(id => sliceInternals.waitForAnimation(id)));
        debugLog('ANIMATION', `All animations complete`);
      }
    }
  };
}; 