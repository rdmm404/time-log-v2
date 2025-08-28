interface TimerStatusProps {
  isRunning: boolean;
  error: string | null;
}

const TimerStatus: React.FC<TimerStatusProps> = ({ isRunning, error }) => {
  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 mb-6 p-2 rounded-lg bg-error/20 text-error font-medium text-sm uppercase tracking-wide">
        <span className="text-lg">⚠</span>
        <span>Error: {error}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-2 mb-6 p-2 rounded-lg font-medium text-sm uppercase tracking-wide ${
      isRunning 
        ? 'bg-primary/20 text-primary' 
        : 'bg-foreground/10 text-text/70'
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