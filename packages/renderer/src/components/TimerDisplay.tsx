import { useTimer } from '../contexts/TimerContext';

interface TimerDisplayProps {
  elapsedTime: number;
  isRunning: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ elapsedTime, isRunning }) => {
  const { formatElapsedTime } = useTimer();

  return (
    <div className="text-center mb-8 relative">
      <div className={`text-6xl font-bold font-mono transition-all duration-200 ${
        isRunning 
          ? 'text-emerald-500' 
          : 'text-slate-700 dark:text-slate-300'
      }`}>
        {formatElapsedTime(elapsedTime)}
      </div>
      <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-8">
        {isRunning && (
          <div className="w-3 h-3 bg-emerald-500 rounded-full pulse-dot"></div>
        )}
      </div>
    </div>
  );
};

export default TimerDisplay;