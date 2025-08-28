import React, { useEffect, useState } from 'react';
import { timeLogAPI, type TimeLog } from '@app/preload';
import TimeLogEditModal from './TimeLogEditModal';

interface TimeLogManagerProps {
  onClose?: () => void;
}

const TimeLogManager: React.FC<TimeLogManagerProps> = ({ onClose }) => {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
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

  // Load recent time logs
  const loadTimeLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const logs = await timeLogAPI.getRecentTimeLogs(50); // Get last 50 entries
      setTimeLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time logs');
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="text-slate-600 dark:text-slate-400">Loading time logs...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Time Log Manager
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              View, edit, and manage your time tracking history
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Time Logs List */}
          <div>
            {timeLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                No time logs found
              </div>
            ) : (
              <div className="space-y-3">
                {timeLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        {/* Time Range */}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {formatDateTime(log.start_time, log.duration !== null && log.duration < 60)}
                          </span>
                          {log.end_time && (
                            <>
                              <span className="text-slate-400">→</span>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {formatDateTime(log.end_time, log.duration !== null && log.duration < 60)}
                              </span>
                            </>
                          )}
                          <div className="ml-auto">
                            {log.duration ? (
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {formatDuration(log.duration)}
                              </span>
                            ) : (
                              <span className="text-sm text-green-600 dark:text-green-400">
                                Running...
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div className="text-slate-800 dark:text-slate-200">
                          {log.description || (
                            <span className="italic text-slate-500 dark:text-slate-400">
                              No description
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => setEditingLog(log)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                        >
                          Edit
                        </button>
                        {deleteConfirming === log.id ? (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleDelete(log.id!)}
                              className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirming(null)}
                              className="px-2 py-1 bg-slate-400 hover:bg-slate-500 text-white rounded text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirming(log.id!)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
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