interface TimerStatusProps {
  isRunning: boolean;
  error: string | null;
}

const TimerStatus: React.FC<TimerStatusProps> = ({ isRunning, error }) => {
  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 mb-6 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium text-sm uppercase tracking-wide">
        <span className="text-lg">⚠</span>
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 mb-6 p-2 rounded-lg font-medium text-sm uppercase tracking-wide ${
      isRunning 
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
    }`}>
      <span className={`text-lg ${isRunning ? 'animate-pulse' : ''}`}>
        {isRunning ? '⏱' : '⏹'}
      </span>
      <span>
        {isRunning ? 'Timer Running' : 'Timer Stopped'}
      </span>
    </div>
  );
};

export default TimerStatus;