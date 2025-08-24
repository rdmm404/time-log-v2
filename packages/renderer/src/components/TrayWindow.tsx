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
    // Listen for timer state updates from main window
    const unsubscribe = trayEvents.onTimerStateUpdate((state: TrayTimerState) => {
      setTimerState(state);
    });

    return () => {
      unsubscribe();
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col items-center space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
            {formatTime(timerState.elapsedTime)}
          </div>
          <div className={`text-sm font-medium ${
            timerState.isRunning 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {timerState.isRunning ? 'Running' : 'Stopped'}
          </div>
          {timerState.description && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate max-w-[200px]">
              {timerState.description}
            </div>
          )}
        </div>

        {/* Control Button */}
        <button
          onClick={handleToggleTimer}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
            timerState.isRunning
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {timerState.isRunning ? 'Stop Timer' : 'Start Timer'}
        </button>

        {/* Quick Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Click outside to close
        </div>
      </div>
    </div>
  );
};