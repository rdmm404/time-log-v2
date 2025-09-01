import React, { useEffect, useState } from 'react';
import { timeLogAPI, projectAPI, type TimeLog, type Project } from '@app/preload';
import TimeLogEditModal from './TimeLogEditModal';

const TimeLogManager: React.FC = () => {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState<number | null>(null);

  // Format duration from seconds to HH:MM:SS
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Format date and time for display
  const formatDateTime = (dateStr: string, showSeconds = false): string => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    if (showSeconds) {
      options.second = '2-digit';
    }

    return date.toLocaleString('en-US', options);
  };

  // Load recent time logs and projects
  const loadTimeLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logs, projectsData] = await Promise.all([
        timeLogAPI.getRecentTimeLogs(50), // Get last 50 entries
        projectAPI.getAllProjects()
      ]);
      setTimeLogs(logs);
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time logs');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get project by ID
  const getProjectById = (projectId: number | null): Project | null => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId) || null;
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    try {
      const success = await timeLogAPI.deleteTimeLog(id);
      if (success) {
        setTimeLogs(prev => prev.filter(log => log.id !== id));
        setDeleteConfirming(null);
      } else {
        setError('Failed to delete time log');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete time log');
    }
  };

  // Handle edit save
  const handleEditSave = (updatedLog: TimeLog) => {
    setTimeLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
    setEditingLog(null);
  };

  useEffect(() => {
    loadTimeLogs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text flex items-center justify-center p-6">
        <div className="text-text/70">Loading time logs...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-text p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">
              Time Log Manager
            </h1>
            <p className="text-text/70">
              View, edit, and manage your time tracking history
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 bg-error/20 text-error rounded-lg">
              {error}
            </div>
          )}

          {/* Time Logs List */}
          <div>
            {timeLogs.length === 0 ? (
              <div className="text-center py-12 text-text/60">
                No time logs found
              </div>
            ) : (
              <div className="space-y-3">
                {timeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-foreground/20 rounded-lg p-4 border border-foreground/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        {/* Time Range */}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-text/70">
                            {formatDateTime(log.start_time, log.duration !== null && log.duration < 60)}
                          </span>
                          {log.end_time && (
                            <>
                              <span className="text-text/50">→</span>
                              <span className="text-sm text-text/70">
                                {formatDateTime(log.end_time, log.duration !== null && log.duration < 60)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Description */}
                        <div className="text-text">
                          {log.description || (
                            <span className="italic text-text/60">
                              No description
                            </span>
                          )}
                        </div>

                        {/* Project */}
                        {log.project_id && (
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const project = getProjectById(log.project_id);
                              return project ? (
                                <>
                                  <div 
                                    className="w-3 h-3 rounded-full border border-white/20"
                                    style={{ backgroundColor: project.color }}
                                  />
                                  <span className="text-sm text-text/70">{project.name}</span>
                                </>
                              ) : (
                                <span className="text-sm text-text/50 italic">Unknown project</span>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Duration */}
                      <div className="mx-4 text-right">
                        {log.duration ? (
                          <span className="text-sm font-medium text-primary">
                            {formatDuration(log.duration)}
                          </span>
                        ) : (
                          <span className="text-sm text-secondary">
                            Running...
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingLog(log)}
                          className="px-3 py-1 bg-primary hover:bg-primary/80 text-background rounded text-sm transition-colors"
                        >
                          Edit
                        </button>
                        {deleteConfirming === log.id ? (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleDelete(log.id!)}
                              className="px-2 py-1 bg-error hover:bg-error/80 text-background rounded text-xs transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirming(null)}
                              className="px-2 py-1 bg-text/40 hover:bg-text/60 text-background rounded text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirming(log.id!)}
                            className="px-3 py-1 bg-error hover:bg-error/80 text-background rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingLog && (
        <TimeLogEditModal
          timeLog={editingLog}
          onSave={handleEditSave}
          onCancel={() => setEditingLog(null)}
        />
      )}
    </>
  );
};

export default TimeLogManager;