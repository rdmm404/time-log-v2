import React from 'react';
import { useProject } from '../contexts/ProjectContext';
import CustomDropdown from './CustomDropdown';
import type { Project } from '@app/preload';

interface ProjectSelectorProps {
  value?: Project | null;
  onChange?: (project: Project | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showActiveProject?: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select project...",
  className = "",
  disabled = false,
  showActiveProject = false
}) => {
  const { projects, activeProject, setActiveProject } = useProject();
  
  const selectedProject = value !== undefined ? value : activeProject;

  const handleSelectProject = (project: Project | null) => {
    if (onChange) {
      onChange(project);
    } else {
      setActiveProject(project);
    }
  };

  // Convert projects to dropdown options
  const projectOptions = projects.map(project => ({
    value: project,
    label: project.name
  }));

  const renderSelected = (option: { value: Project; label: string } | null) => {
    const project = option?.value || selectedProject;
    
    if (!project) {
      return <span className="text-text/50 truncate">{placeholder}</span>;
    }

    return (
      <div className="flex items-center space-x-2">
        <div 
          className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <span className="truncate">{project.name}</span>
        {showActiveProject && project === activeProject && (
          <span className="text-primary text-xs bg-primary/10 px-1 py-0.5 rounded flex-shrink-0">
            Active
          </span>
        )}
      </div>
    );
  };

  const renderOption = (option: { value: Project; label: string }, isSelected: boolean) => {
    const project = option.value;
    
    return (
      <div className="flex items-center space-x-2">
        <div 
          className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="truncate text-text">{project.name}</span>
            {project === activeProject && (
              <span className="text-primary text-xs bg-primary/10 px-1 py-0.5 rounded flex-shrink-0">
                Active
              </span>
            )}
          </div>
          {project.description && (
            <div className="text-xs text-text/60 truncate">
              {project.description}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <CustomDropdown
      value={selectedProject}
      onChange={handleSelectProject}
      options={projectOptions}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      allowClear={true}
      clearLabel="No project"
      emptyMessage="No projects available"
      renderSelected={renderSelected}
      renderOption={renderOption}
    />
  );
};

export default ProjectSelector;