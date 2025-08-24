import { useState } from 'react';
import { useTimerActions } from '../hooks/useTimerActions';

interface TimerControlsProps {
  isRunning: boolean;
  isLoading: boolean;
  description: string;
  onDescriptionChange: (description: string) => void;
}

const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  isLoading,
  description,
  onDescriptionChange
}) => {
  const { startTimer, stopTimer, setDescription } = useTimerActions();
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    try {
      setError(null);
      await startTimer(description);
      setDescription(description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer');
    }
  };

  const handleStop = async () => {
    try {
      setError(null);
      await stopTimer(description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
    }
  };

  const handleDescriptionChange = (value: string) => {
    onDescriptionChange(value);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full">
        <input
          type="text"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="What are you working on?"
          className="w-full px-4 py-3 text-base border-2 border-slate-200 dark:border-slate-600 rounded-lg 
                   bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 
                   placeholder-slate-400 dark:placeholder-slate-500
                   focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 outline-none"
          disabled={isLoading}
        />
      </div>
      
      <div className="flex gap-4 justify-center">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="px-8 py-4 text-base font-semibold rounded-lg 
                     bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                     text-white shadow-sm hover:shadow-md active:shadow-sm
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-emerald-500 disabled:hover:shadow-sm
                     transform hover:scale-105 active:scale-100 disabled:transform-none
                     transition-all duration-200 outline-none 
                     focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                     min-w-[140px]"
          >
            {isLoading ? 'Starting...' : 'Start Timer'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={isLoading}
            className="px-8 py-4 text-base font-semibold rounded-lg 
                     bg-red-500 hover:bg-red-600 active:bg-red-700
                     text-white shadow-sm hover:shadow-md active:shadow-sm
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-red-500 disabled:hover:shadow-sm
                     transform hover:scale-105 active:scale-100 disabled:transform-none
                     transition-all duration-200 outline-none 
                     focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                     min-w-[140px]"
          >
            {isLoading ? 'Stopping...' : 'Stop Timer'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                      rounded-lg text-red-600 dark:text-red-400 text-sm text-center
                      animate-pulse">
          {error}
        </div>
      )}
    </div>
  );
};

export default TimerControls;