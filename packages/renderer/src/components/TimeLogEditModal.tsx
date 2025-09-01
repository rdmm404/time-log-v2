import React, { useState, useEffect } from 'react';
import { timeLogAPI, projectAPI, type TimeLog, type Project } from '@app/preload';
import ProjectSelector from './ProjectSelector';

interface TimeLogEditModalProps {
  timeLog: TimeLog;
  onSave: (updatedLog: TimeLog) => void;
  onCancel: () => void;
}

interface FormData {
  start_time: string;
  end_time: string;
  description: string;
  project_id: number | null;
}

const TimeLogEditModal: React.FC<TimeLogEditModalProps> = ({ timeLog, onSave, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    start_time: '',
    end_time: '',
    description: timeLog.description || '',
    project_id: timeLog.project_id || null
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data and load projects
  useEffect(() => {
    const initializeData = async () => {
      // Load projects and set selected project if timeLog has one
      try {
        const projectsData = await projectAPI.getAllProjects();
        
        // Set selected project if timeLog has one
        if (timeLog.project_id) {
          const selectedProj = projectsData.find(p => p.id === timeLog.project_id);
          setSelectedProject(selectedProj || null);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };

    const startDate = new Date(timeLog.start_time);
    const endDate = timeLog.end_time ? new Date(timeLog.end_time) : new Date();

    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      start_time: formatForInput(startDate),
      end_time: timeLog.end_time ? formatForInput(endDate) : formatForInput(new Date()),
      description: timeLog.description || '',
      project_id: timeLog.project_id || null
    });

    initializeData();
  }, [timeLog]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form data
  const validateForm = (): boolean => {
    if (!formData.start_time || !formData.end_time) {
      setError('Both start and end times are required');
      return false;
    }

    const startTime = new Date(formData.start_time);
    const endTime = new Date(formData.end_time);

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return false;
    }

    // Check if the time range is reasonable (not more than 24 hours)
    const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      setError('Time log cannot be longer than 24 hours');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSave = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const startTime = new Date(formData.start_time).toISOString();
      const endTime = new Date(formData.end_time).toISOString();
      const duration = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);

      const updates: Partial<TimeLog> = {
        start_time: startTime,
        end_time: endTime,
        duration,
        description: formData.description.trim(),
        project_id: selectedProject?.id || null
      };

      const updatedLog = await timeLogAPI.updateTimeLog(timeLog.id!, updates);
      if (updatedLog) {
        onSave(updatedLog);
      } else {
        setError('Failed to update time log');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update time log');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate duration preview
  const calculateDuration = (): string => {
    if (!formData.start_time || !formData.end_time) {
      return '0h 0m';
    }

    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);
    const diffSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (diffSeconds <= 0) {
      return '0h 0m';
    }

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
      <div className="bg-background border border-foreground/30 rounded-lg max-w-md w-full m-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-foreground/30">
          <h3 className="text-xl font-semibold text-text">
            Edit Time Log
          </h3>
          <button
            onClick={onCancel}
            className="text-text/50 hover:text-text text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-error/20 text-error rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              name="start_time"
              value={formData.start_time}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-foreground/30 rounded-lg 
                         bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              name="end_time"
              value={formData.end_time}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-foreground/30 rounded-lg 
                         bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duration Preview */}
          <div className="text-sm text-text/70">
            Duration: <span className="font-medium text-primary">
              {calculateDuration()}
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-3 py-2 border border-foreground/30 rounded-lg 
                         bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Project
            </label>
            <ProjectSelector
              value={selectedProject}
              onChange={setSelectedProject}
              placeholder="No project selected"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 disabled:bg-primary/40 
                         text-white rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-text/40 hover:bg-text/60 disabled:bg-text/20 
                         text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeLogEditModal;