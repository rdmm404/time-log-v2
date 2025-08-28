import React, { useEffect, useState } from 'react';
import { trayAPI, trayEvents } from '@app/preload';

interface TrayTimerState {
  isRunning: boolean;
  elapsedTime: number;
  description: string;
}

export const TrayWindow: React.FC = () => {
  const [timerState, setTimerState] = useState<TrayTimerState>({
    isRunning: false,
    elapsedTime: 0,
    description: ''
  });

  useEffect(() => {
    // Listen for timer state updates from main process
    const unsubscribe = trayEvents.onTimerStateUpdate((state: TrayTimerState) => {
      setTimerState(state);
    });

    // Request current state when component mounts
    const timer = setTimeout(() => {
      trayAPI.requestCurrentState();
    }, 100);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = async () => {
    try {
      if (timerState.isRunning) {
        await trayAPI.stopTimer();
      } else {
        await trayAPI.startTimer();
      }
    } catch (error) {
      console.error('Failed to toggle timer from tray:', error);
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-lg p-4 border border-foreground/30">
      <div className="flex flex-col items-center space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-text">
            {formatTime(timerState.elapsedTime)}
          </div>
          <div className={`text-sm font-medium ${
            timerState.isRunning 
              ? 'text-primary' 
              : 'text-text/70'
          }`}>
            {timerState.isRunning ? 'Running' : 'Stopped'}
          </div>
          {timerState.description && (
            <div className="text-xs text-text/70 mt-1 truncate max-w-[200px]">
              {timerState.description}
            </div>
          )}
        </div>

        {/* Control Button */}
        <button
          onClick={handleToggleTimer}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
            timerState.isRunning
              ? 'bg-error hover:bg-error/80 text-background'
              : 'bg-primary hover:bg-primary/80 text-background'
          }`}
        >
          {timerState.isRunning ? 'Stop Timer' : 'Start Timer'}
        </button>

        {/* Quick Info */}
        <div className="text-xs text-text/60 text-center">
          Click outside to close
        </div>
      </div>
    </div>
  );
};