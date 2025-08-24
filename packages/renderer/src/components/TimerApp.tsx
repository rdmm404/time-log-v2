import { useState } from 'react';
import TimerDisplay from './TimerDisplay';
import TimerControls from './TimerControls';
import TimerStatus from './TimerStatus';
import { useTimer } from '../contexts/TimerContext';

const TimerApp: React.FC = () => {
  const { state } = useTimer();
  const [description, setDescription] = useState('');

  return (
    <div className="w-full max-w-md">
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 shadow-xl transition-all duration-200">
        <TimerStatus isRunning={state.isRunning} error={state.error} />
        <TimerDisplay elapsedTime={state.elapsedTime} isRunning={state.isRunning} />
        <TimerControls 
          isRunning={state.isRunning}
          isLoading={state.isLoading}
          description={description}
          onDescriptionChange={setDescription}
        />
      </div>
    </div>
  );
};

export default TimerApp;