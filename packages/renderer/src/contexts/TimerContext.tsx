import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { timeLogAPI, mainWindowAPI, trayEvents, type TimeLog } from '@app/preload';

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

  // Calculate elapsed time from start time
  const calculateElapsedTime = useCallback((startTime: string): number => {
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 1000);
  }, []);

  // Start timer interval
  const startTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (state.currentSession && startTimeRef.current) {
        const elapsedSeconds = calculateElapsedTime(state.currentSession.start_time);
        dispatch({ type: 'UPDATE_ELAPSED_TIME', payload: { elapsedTime: elapsedSeconds } });
      }
    }, 1000);
  }, [state.currentSession, calculateElapsedTime]);

  // Stop timer interval
  const stopTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  // Start timer function
  const startTimer = useCallback(async (description?: string, projectId?: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
      dispatch({ type: 'SET_ERROR', payload: { error: null } });

      const finalDescription = description || state.description || '';
      const finalProjectId = projectId !== undefined ? projectId : (state.projectId ?? undefined);

      const session = await timeLogAPI.startTimer(finalDescription, finalProjectId);
      
      dispatch({ type: 'START_TIMER', payload: { session } });
      startTimeRef.current = new Date(session.start_time);
      startTimerInterval();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start timer';
      dispatch({ type: 'SET_ERROR', payload: { error: errorMessage } });
    }
  }, [state.description, state.projectId, startTimerInterval]);

  // Stop timer function
  const stopTimer = useCallback(async (description?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
      dispatch({ type: 'SET_ERROR', payload: { error: null } });

      const finalDescription = description !== undefined ? description : state.description;
      
      await timeLogAPI.stopTimer(finalDescription);
      
      stopTimerInterval();
      dispatch({ type: 'STOP_TIMER' });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop timer';
      dispatch({ type: 'SET_ERROR', payload: { error: errorMessage } });
    }
  }, [state.description, stopTimerInterval]);

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

  // Send timer state to tray - removed useCallback to avoid circular dependency
  const sendTimerStateToTray = () => {
    const timerState = {
      isRunning: state.isRunning,
      elapsedTime: state.elapsedTime,
      description: state.description
    };
    mainWindowAPI.sendTimerStateToTray(timerState);
  };

  // Restore active session on app startup (persistent timer state)
  useEffect(() => {
    const restoreActiveSession = async () => {
      try {
        const activeSession = await timeLogAPI.getActiveTimer();
        if (activeSession) {
          const elapsedTime = calculateElapsedTime(activeSession.start_time);
          dispatch({ 
            type: 'RESTORE_SESSION', 
            payload: { session: activeSession, elapsedTime } 
          });
          startTimeRef.current = new Date(activeSession.start_time);
          startTimerInterval();
        }
      } catch (error) {
        console.error('Failed to restore active session:', error);
        // Don't show error to user for restoration failures
      }
    };

    restoreActiveSession();
  }, [calculateElapsedTime, startTimerInterval]);

  // Setup tray communication
  useEffect(() => {
    // Set up handlers for tray timer actions
    const unsubscribeStart = mainWindowAPI.onStartTimerFromTray(() => {
      startTimer();
    });

    const unsubscribeStop = mainWindowAPI.onStopTimerFromTray(() => {
      stopTimer();
    });

    // Listen for tray toggle events
    const unsubscribeToggle = trayEvents.onToggleTimer(() => {
      if (state.isRunning) {
        stopTimer();
      } else {
        startTimer();
      }
    });

    // Listen for tray requesting current state
    const unsubscribeStateRequest = trayEvents.onRequestCurrentState(() => {
      sendTimerStateToTray();
    });

    return () => {
      unsubscribeStart();
      unsubscribeStop();
      unsubscribeToggle();
      unsubscribeStateRequest();
    };
  }, [startTimer, stopTimer, state.isRunning]);

  // Send timer state updates to tray whenever relevant state changes
  useEffect(() => {
    sendTimerStateToTray();
  }, [state.isRunning, state.elapsedTime, state.description]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      stopTimerInterval();
    };
  }, [stopTimerInterval]);

  // Update timer interval when session changes
  useEffect(() => {
    if (state.isRunning && state.currentSession) {
      startTimerInterval();
    } else {
      stopTimerInterval();
    }
  }, [state.isRunning, state.currentSession, startTimerInterval, stopTimerInterval]);

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