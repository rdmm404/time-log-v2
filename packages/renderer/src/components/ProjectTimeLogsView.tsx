import React, { useState, useEffect } from 'react';
import { timeLogAPI, projectAPI, type TimeLog, type Project } from '@app/preload';
import { formatTime } from '../utils/timeUtils';

interface ProjectTimeLogsViewProps {
  projectId: number;
  onBack: () => void;
}

const ProjectTimeLogsView: React.FC<ProjectTimeLogsViewProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projectData, timeLogsData] = await Promise.all([
        projectAPI.getProjectById(projectId),
        timeLogAPI.getTimeLogsByProject(projectId)
      ]);
      setProject(projectData);
      setTimeLogs(timeLogsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  };

  const formatDateRange = (startTime: string, endTime: string | null): string => {
    const start = new Date(startTime);
    const startFormatted = formatTime(start);
    
    if (!endTime) {
      return `${startFormatted} - Running`;
    }
    
    const end = new Date(endTime);
    const endFormatted = formatTime(end);
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const groupTimeLogsByDate = (logs: TimeLog[]) => {
    const groups: { [date: string]: TimeLog[] } = {};
    
    logs.forEach(log => {
      const date = new Date(log.start_time).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });
    
    return groups;
  };

  const getTotalDuration = (logs: TimeLog[]): number => {
    return logs.reduce((total, log) => total + (log.duration || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-text/60">Loading project time logs...</div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background text-text p-6">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-text/70 hover:text-text transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Projects</span>
          </button>
        </div>
        <div className="text-center py-12">
          <div className="text-error mb-4">{error || 'Project not found'}</div>
        </div>
      </div>
    );
  }

  const groupedLogs = groupTimeLogsByDate(timeLogs);
  const totalDuration = getTotalDuration(timeLogs);

  return (
    <div className="min-h-screen bg-background text-text p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-text/70 hover:text-text transition-colors duration-200 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Projects</span>
        </button>
        
        <div className="flex items-center space-x-4">
          <div 
            className="w-6 h-6 rounded-full border-2 border-white/20"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h1 className="text-2xl font-bold text-text">{project.name}</h1>
            {project.description && (
              <p className="text-text/70 mt-1">{project.description}</p>
            )}
          </div>
        </div>
        
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-text/60">Total time:</span>
            <span className="text-text font-medium">{formatDuration(totalDuration)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-text/60">Time entries:</span>
            <span className="text-text font-medium">{timeLogs.length}</span>
          </div>
        </div>
      </div>

      {/* Time Logs */}
      {timeLogs.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-text/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-text/70 mb-2">No time logs yet</h3>
          <p className="text-text/50">Start tracking time for this project to see entries here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([date, logs]) => {
              const dailyTotal = getTotalDuration(logs);
              return (
                <div key={date} className="bg-foreground/30 rounded-lg p-4 border border-foreground/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-text">{date}</h3>
                    <span className="text-sm text-text/70">{formatDuration(dailyTotal)}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between py-2">
                        <div className="flex-1">
                          <div className="text-sm text-text/80">
                            {formatDateRange(log.start_time, log.end_time)}
                          </div>
                          {log.description && (
                            <div className="text-sm text-text/60 mt-1">{log.description}</div>
                          )}
                        </div>
                        <div className="text-sm font-medium text-text ml-4">
                          {log.duration ? formatDuration(log.duration) : 'Running'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default ProjectTimeLogsView;