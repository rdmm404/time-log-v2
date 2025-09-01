import React, { useState, useEffect } from 'react';
import { projectAPI } from '@app/preload';
import type { Project } from '@app/preload';

interface ProjectEditModalProps {
  project: Project | null;
  onClose: (projectSaved: boolean) => void;
}

const PROJECT_COLORS = [
  '#7A8450', // primary (green)
  '#734B5E', // secondary (purple)
  '#F6511D', // error (orange)
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({ project, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#7A8450'
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [saving, setSaving] = useState(false);

  const isEditing = !!project;

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        color: project.color
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#7A8450'
      });
    }
    setErrors({});
  }, [project]);

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Project name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Project name must be less than 50 characters';
    }

    if (formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color
      };

      if (isEditing && project) {
        await projectAPI.updateProject(project.id!, projectData);
      } else {
        await projectAPI.createProject(projectData);
      }

      onClose(true);
    } catch (error) {
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to save project' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-foreground/20 rounded-lg p-6 w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-text mb-6">
          {isEditing ? 'Edit Project' : 'New Project'}
        </h3>

        {errors.submit && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {errors.submit}
          </div>
        )}

        <div className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-text/80 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-foreground/20 border border-foreground/30 rounded-lg text-text placeholder-text/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Enter project name"
              maxLength={50}
            />
            {errors.name && (
              <p className="text-error text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium text-text/80 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-foreground/20 border border-foreground/30 rounded-lg text-text placeholder-text/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              placeholder="Optional project description"
              rows={3}
              maxLength={200}
            />
            {errors.description && (
              <p className="text-error text-xs mt-1">{errors.description}</p>
            )}
            <p className="text-text/50 text-xs mt-1">{formData.description.length}/200</p>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-text/80 mb-3">
              Project Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                    formData.color === color 
                      ? 'border-text ring-2 ring-primary/50' 
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-text/60 text-xs">Selected:</span>
              <div 
                className="w-4 h-4 rounded border border-white/20"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-text/60 text-xs font-mono">{formData.color}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-foreground/10">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-text/70 hover:text-text border border-foreground/20 hover:border-foreground/40 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="px-4 py-2 bg-primary text-background hover:bg-primary/90 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            )}
            <span>{isEditing ? 'Save Changes' : 'Create Project'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};