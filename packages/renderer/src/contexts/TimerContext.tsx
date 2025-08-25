import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { timeLogAPI, trayAPI, mainWindowEvents, type TimeLog } from '@app/preload';

export interface TimerState {
  isRunning: boolean;
  currentSession: TimeLog | null;
  elapsedTime: number; // in seconds
  description: string;
  projectId: number | null;
  error: string | null;
  isLoading: boolean;
}

export type TimerAction =
  | { type: 'START_TIMER'; payload: { session: TimeLog } }
  | { type: 'STOP_TIMER' }
  | { type: 'UPDATE_ELAPSED_TIME'; payload: { elapsedTime: number } }
  | { type: 'SET_DESCRIPTION'; payload: { description: string } }
  | { type: 'SET_PROJECT_ID'; payload: { projectId: number | null } }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_ERROR'; payload: { error: string | null } }
  | { type: 'RESTORE_SESSION'; payload: { session: TimeLog; elapsedTime: number } }
  | { type: 'CLEAR_SESSION' };

const initialState: TimerState = {
  isRunning: false,
  currentSession: null,
  elapsedTime: 0,
  description: '',
  projectId: null,
  error: null,
  isLoading: false,
};

function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START_TIMER':
      return {
        ...state,
        isRunning: true,
        currentSession: action.payload.session,
        elapsedTime: 0,
        error: null,
        isLoading: false,
      };
    
    case 'STOP_TIMER':
      return {
        ...state,
        isRunning: false,
        currentSession: null,
        elapsedTime: 0,
        description: '',
        error: null,
        isLoading: false,
      };
    
    case 'UPDATE_ELAPSED_TIME':
      return {
        ...state,
        elapsedTime: action.payload.elapsedTime,
      };
    
    case 'SET_DESCRIPTION':
      return {
        ...state,
        description: action.payload.description,
      };
    
    case 'SET_PROJECT_ID':
      return {
        ...state,
        projectId: action.payload.projectId,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload.error,
        isLoading: false,
      };
    
    case 'RESTORE_SESSION':
      return {
        ...state,
        isRunning: true,
        currentSession: action.payload.session,
        elapsedTime: action.payload.elapsedTime,
        description: action.payload.session.description,
        projectId: action.payload.session.project_id,
        error: null,
        isLoading: false,
      };
    
    case 'CLEAR_SESSION':
      return {
        ...state,
        isRunning: false,
        currentSession: null,
        elapsedTime: 0,
        error: null,
      };
    
    default:
      return state;
  }
}

export interface TimerContextType {
  state: TimerState;
  startTimer: (description?: string, projectId?: number) => Promise<void>;
  stopTimer: (description?: string) => Promise<void>;
  setDescription: (description: string) => void;
  setProjectId: (projectId: number | null) => void;
  formatElapsedTime: (seconds: number) => string;
  clearError: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(timerReducer, initialState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // No longer calculating elapsed time locally - main process handles this

  // No longer managing timer intervals - main process handles timing

  // Stop timer interval
  const stopTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  // Start timer function - delegates to main process
  const startTimer = useCallback(async (description?: string, projectId?: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
      dispatch({ type: 'SET_ERROR', payload: { error: null } });

      const finalDescription = description || state.description || '';
      const finalProjectId = projectId !== undefined ? projectId : (state.projectId ?? undefined);

      // Main process timer handles all logic - we just call the API
      await timeLogAPI.startTimer(finalDescription, finalProjectId);
      // State will be updated via the main process state change event
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start timer';
      dispatch({ type: 'SET_ERROR', payload: { error: errorMessage } });
    }
  }, [state.description, state.projectId]);

  // Stop timer function - delegates to main process
  const stopTimer = useCallback(async (description?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
      dispatch({ type: 'SET_ERROR', payload: { error: null } });

      const finalDescription = description !== undefined ? description : state.description;
      
      // Main process timer handles all logic - we just call the API
      await timeLogAPI.stopTimer(finalDescription);
      // State will be updated via the main process state change event
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop timer';
      dispatch({ type: 'SET_ERROR', payload: { error: errorMessage } });
    }
  }, [state.description]);

  // Set description
  const setDescription = useCallback((description: string) => {
    dispatch({ type: 'SET_DESCRIPTION', payload: { description } });
  }, []);

  // Set project ID
  const setProjectId = useCallback((projectId: number | null) => {
    dispatch({ type: 'SET_PROJECT_ID', payload: { projectId } });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: { error: null } });
  }, []);

  // No longer sending state to tray - main process is the source of truth

  // Main process handles session restoration - renderer just waits for state updates

  // Listen to main process timer state changes
  useEffect(() => {
    // Listen for timer state changes from main process (sent via SystemTray to main window)
    const unsubscribeMainWindow = mainWindowEvents.onTimerStateChanged((timerState: any) => {
      // Always sync renderer state with main process state
      if (timerState.isRunning) {
        if (timerState.currentSession) {
          dispatch({ 
            type: 'RESTORE_SESSION', 
            payload: { 
              session: timerState.currentSession, 
              elapsedTime: timerState.elapsedTime 
            } 
          });
          startTimeRef.current = new Date(timerState.currentSession.start_time);
        }
      } else {
        // Timer is stopped
        stopTimerInterval();
        dispatch({ type: 'STOP_TIMER' });
      }
    });

    return () => {
      unsubscribeMainWindow();
    };
  }, []);

  // Request current timer state from main process when component mounts
  useEffect(() => {
    // Request current state from main process
    const timer = setTimeout(() => {
      trayAPI.requestCurrentState();
    }, 100); // Small delay to ensure IPC is ready

    return () => clearTimeout(timer);
  }, []);

  // No longer sending state to tray - main process is the source of truth

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      stopTimerInterval();
    };
  }, []);

  // No longer managing timer intervals - main process handles timing

  const contextValue: TimerContextType = {
    state,
    startTimer,
    stopTimer,
    setDescription,
    setProjectId,
    formatElapsedTime,
    clearError,
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
};