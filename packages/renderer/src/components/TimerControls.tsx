import { useState, useEffect } from 'react';
import { useTimerActions } from '../hooks/useTimerActions';
import { useProject } from '../contexts/ProjectContext';
import ProjectSelector from './ProjectSelector';
import { ProjectEditModal } from './ProjectEditModal';
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
  const { activeProject, mostRecentProject, loadMostRecentProject, loadProjects } = useProject();
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [hasUserSelectedProject, setHasUserSelectedProject] = useState(false);

  // Reset selected project to MRU when MRU changes (including null for "No project")
  useEffect(() => {
    if (!hasUserSelectedProject) {
      setSelectedProject(mostRecentProject);
    }
  }, [mostRecentProject, hasUserSelectedProject]);

  const handleStart = async () => {
    try {
      setError(null);
      const projectToUse = selectedProject || activeProject;
      await startTimer(description, projectToUse?.id);
      setDescription(description);

      // Reload MRU project from database since we just created a new time log
      await loadMostRecentProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start timer");
    }
  };

  const handleStop = async () => {
    try {
      setError(null);
      await stopTimer(description);

      // Reset user selection flag after stopping, so next timer will use MRU
      setHasUserSelectedProject(false);

      // Reload MRU project since the most recent time log has changed
      await loadMostRecentProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop timer");
    }
  };

  const handleDescriptionChange = (value: string) => {
    onDescriptionChange(value);
  };

  const handleCreateProject = () => {
    setIsCreateProjectModalOpen(true);
  };

  const handleProjectModalClose = async (projectSaved: boolean) => {
    setIsCreateProjectModalOpen(false);
    if (projectSaved) {
      // Reload projects list to show the new project in dropdown
      await loadProjects();
      // Also reload MRU project
      await loadMostRecentProject();
    }
  };

  const handleProjectChange = (project: Project | null) => {
    setSelectedProject(project);
    setHasUserSelectedProject(true);
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
          <div className="flex gap-2">
            <div className="flex-1">
              <ProjectSelector
                value={selectedProject}
                onChange={handleProjectChange}
                placeholder="No project"
                disabled={isLoading || isRunning}
                showActiveProject={true}
              />
            </div>
            <button
              onClick={handleCreateProject}
              disabled={isLoading || isRunning}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-background rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondary
                       transition-colors duration-200 flex items-center justify-center
                       focus:outline-none focus:ring-2 focus:ring-secondary/50"
              title="Create new project"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
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
            {isLoading ? "Starting..." : "Start Timer"}
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
            {isLoading ? "Stopping..." : "Stop Timer"}
          </button>
        )}
      </div>

      {error && (
        <div
          className="p-3 bg-error/20 border border-error/30
                      rounded-lg text-error text-sm text-center
                      animate-pulse"
        >
          {error}
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateProjectModalOpen && (
        <ProjectEditModal project={null} onClose={handleProjectModalClose} />
      )}
    </div>
  );
};

export default TimerControls;