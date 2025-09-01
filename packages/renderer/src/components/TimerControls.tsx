import { useState } from 'react';
import { useTimerActions } from '../hooks/useTimerActions';
import { useProject } from '../contexts/ProjectContext';
import ProjectSelector from './ProjectSelector';
import type { Project } from '@app/preload';

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
  const { activeProject } = useProject();
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleStart = async () => {
    try {
      setError(null);
      const projectToUse = selectedProject || activeProject;
      await startTimer(description, projectToUse?.id);
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
      <div className="w-full space-y-4">
        <input
          type="text"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="What are you working on?"
          className="w-full px-4 py-3 text-base border-2 border-foreground/30 rounded-lg 
                   bg-background text-text 
                   placeholder-text/50
                   focus:border-primary focus:ring-3 focus:ring-primary/10 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 outline-none"
          disabled={isLoading}
        />
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text/80">
            Project (optional)
          </label>
          <ProjectSelector
            value={selectedProject}
            onChange={setSelectedProject}
            placeholder="Select project or use default..."
            disabled={isLoading || isRunning}
            showActiveProject={true}
          />
        </div>
      </div>
      
      <div className="flex gap-4 justify-center">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="px-8 py-4 text-base font-semibold rounded-lg 
                     bg-primary hover:bg-primary/90 active:bg-primary/80
                     text-background shadow-sm hover:shadow-md active:shadow-sm
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-sm
                     transform hover:scale-105 active:scale-100 disabled:transform-none
                     transition-all duration-200 outline-none 
                     focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                     min-w-[140px]"
          >
            {isLoading ? 'Starting...' : 'Start Timer'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={isLoading}
            className="px-8 py-4 text-base font-semibold rounded-lg 
                     bg-error hover:bg-error/90 active:bg-error/80
                     text-background shadow-sm hover:shadow-md active:shadow-sm
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-error disabled:hover:shadow-sm
                     transform hover:scale-105 active:scale-100 disabled:transform-none
                     transition-all duration-200 outline-none 
                     focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                     min-w-[140px]"
          >
            {isLoading ? 'Stopping...' : 'Stop Timer'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-error/20 border border-error/30 
                      rounded-lg text-error text-sm text-center
                      animate-pulse">
          {error}
        </div>
      )}
    </div>
  );
};

export default TimerControls;