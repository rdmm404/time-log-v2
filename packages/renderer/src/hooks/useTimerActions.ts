import { useCallback } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { validateTimerSession, validateTimerDuration } from '../utils/timerValidation';
import { timeLogAPI } from '@app/preload';

/**
 * Custom hook for timer actions with validation
 */
export const useTimerActions = () => {
  const { state, startTimer, stopTimer, setDescription, setProjectId, clearError } = useTimer();

  // Start timer with validation
  const startTimerWithValidation = useCallback(async (
    description?: string, 
    projectId?: number
  ) => {
    const finalDescription = description || state.description || '';
    const validation = validateTimerSession(finalDescription, projectId);
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Show warnings but don't block
    if (validation.warnings.length > 0) {
      console.warn('Timer validation warnings:', validation.warnings);
    }

    return startTimer(finalDescription, projectId);
  }, [startTimer, state.description]);

  // Stop timer with validation
  const stopTimerWithValidation = useCallback(async (description?: string) => {
    if (!state.isRunning || !state.currentSession) {
      throw new Error('No active timer to stop');
    }

    const finalDescription = description !== undefined ? description : state.description;
    const durationValidation = validateTimerDuration(state.elapsedTime);
    
    if (!durationValidation.isValid) {
      throw new Error(durationValidation.errors.join(', '));
    }

    // Show warnings but don't block
    if (durationValidation.warnings.length > 0) {
      console.warn('Timer duration warnings:', durationValidation.warnings);
    }

    return stopTimer(finalDescription);
  }, [stopTimer, state.isRunning, state.currentSession, state.description, state.elapsedTime]);

  // Quick start timer with current settings
  const quickStart = useCallback(async () => {
    return startTimerWithValidation(state.description, state.projectId ?? undefined);
  }, [startTimerWithValidation, state.description, state.projectId]);

  // Toggle timer (start if stopped, stop if running)
  const toggleTimer = useCallback(async () => {
    if (state.isRunning) {
      return stopTimerWithValidation();
    } else {
      return startTimerWithValidation();
    }
  }, [state.isRunning, startTimerWithValidation, stopTimerWithValidation]);

  // Update description with validation
  const setDescriptionWithValidation = useCallback((description: string) => {
    const validation = validateTimerSession(description, state.projectId);
    
    if (validation.errors.length > 0) {
      console.warn('Description validation errors:', validation.errors);
    }

    setDescription(description);
  }, [setDescription, state.projectId]);

  return {
    // State
    ...state,
    
    // Basic actions
    startTimer: startTimerWithValidation,
    stopTimer: stopTimerWithValidation,
    setDescription: setDescriptionWithValidation,
    setProjectId,
    clearError,
    
    // Enhanced actions
    quickStart,
    toggleTimer,
    
    // Utility functions
    isIdle: !state.isRunning && !state.isLoading,
    canStart: !state.isRunning && !state.isLoading,
    canStop: state.isRunning && !state.isLoading,
    hasActiveSession: state.isRunning && state.currentSession !== null,
  };
};

/**
 * Hook for timer statistics and insights
 */
export const useTimerStats = () => {
  const { state } = useTimer();

  // Get today's stats
  const getTodaysStats = useCallback(async () => {
    try {
      const [timeLogs, totalDuration] = await Promise.all([
        timeLogAPI.getTodaysTimeLogs(),
        timeLogAPI.getTodaysDuration()
      ]);

      const completedSessions = timeLogs.filter(log => log.end_time !== null).length;
      const activeSession = timeLogs.find(log => log.end_time === null);

      return {
        totalDuration,
        completedSessions,
        hasActiveSession: !!activeSession,
        activeSessionDuration: activeSession ? state.elapsedTime : 0,
        totalWithActive: totalDuration + (activeSession ? state.elapsedTime : 0),
        timeLogs
      };
    } catch (error) {
      console.error('Failed to get today\'s stats:', error);
      return null;
    }
  }, [state.elapsedTime]);

  // Get recent activity
  const getRecentActivity = useCallback(async (limit = 5) => {
    try {
      return await timeLogAPI.getRecentTimeLogs(limit);
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }, []);

  return {
    getTodaysStats,
    getRecentActivity,
  };
};

/**
 * Hook for timer persistence and recovery
 */
export const useTimerPersistence = () => {
  const { state } = useTimer();

  // Save timer state to local storage (backup)
  const saveTimerState = useCallback(() => {
    if (state.currentSession) {
      const timerBackup = {
        sessionId: state.currentSession.id,
        startTime: state.currentSession.start_time,
        description: state.description,
        projectId: state.projectId,
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem('timer-backup', JSON.stringify(timerBackup));
    } else {
      localStorage.removeItem('timer-backup');
    }
  }, [state.currentSession, state.description, state.projectId]);

  // Load timer backup from local storage
  const loadTimerBackup = useCallback(() => {
    try {
      const backup = localStorage.getItem('timer-backup');
      return backup ? JSON.parse(backup) : null;
    } catch (error) {
      console.error('Failed to load timer backup:', error);
      return null;
    }
  }, []);

  // Clear timer backup
  const clearTimerBackup = useCallback(() => {
    localStorage.removeItem('timer-backup');
  }, []);

  return {
    saveTimerState,
    loadTimerBackup,
    clearTimerBackup,
  };
};