import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
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
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedProject = value !== undefined ? value : activeProject;

  const handleSelectProject = (project: Project | null) => {
    if (onChange) {
      onChange(project);
    } else {
      setActiveProject(project);
    }
    setIsOpen(false);
  };

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggleDropdown}
        disabled={disabled}
        className={`
          w-full px-3 py-2 bg-foreground/20 border border-foreground/30 rounded-lg text-text text-left
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
          transition-colors duration-200 flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-foreground/50'}
        `}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {selectedProject ? (
            <>
              <div 
                className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                style={{ backgroundColor: selectedProject.color }}
              />
              <span className="truncate">{selectedProject.name}</span>
              {showActiveProject && selectedProject === activeProject && (
                <span className="text-primary text-xs bg-primary/10 px-1 py-0.5 rounded flex-shrink-0">
                  Active
                </span>
              )}
            </>
          ) : (
            <span className="text-text/50 truncate">{placeholder}</span>
          )}
        </div>
        
        <svg 
          className={`w-4 h-4 text-text/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-foreground/20 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Clear selection option */}
          <button
            type="button"
            onClick={() => handleSelectProject(null)}
            className="w-full px-3 py-2 text-left hover:bg-foreground/10 text-text/70 text-sm border-b border-foreground/10"
          >
            <span className="italic">No project</span>
          </button>
          
          {projects.length === 0 ? (
            <div className="px-3 py-2 text-text/50 text-sm">
              No projects available
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleSelectProject(project)}
                className={`
                  w-full px-3 py-2 text-left hover:bg-foreground/10 flex items-center space-x-2
                  ${selectedProject?.id === project.id ? 'bg-foreground/20' : ''}
                `}
              >
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
              </button>
            ))
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectSelector;