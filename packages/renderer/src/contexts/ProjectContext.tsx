import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { projectAPI, type Project } from '@app/preload';

interface ProjectContextValue {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  mostRecentProject: Project | null;
  loadMostRecentProject: () => Promise<void>;
  projects: Project[];
  loadProjects: () => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

const ACTIVE_PROJECT_KEY = 'timetracker_active_project_id';

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [mostRecentProject, setMostRecentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Load projects from the database
  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await projectAPI.getAllProjects();
      setProjects(projectsData);
      
      // Restore active project from localStorage if it exists
      const activeProjectId = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (activeProjectId) {
        const activeProjectData = projectsData.find(p => p.id === parseInt(activeProjectId));
        if (activeProjectData) {
          setActiveProjectState(activeProjectData);
        } else {
          // Active project no longer exists, clear it
          localStorage.removeItem(ACTIVE_PROJECT_KEY);
          setActiveProjectState(null);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load most recently used project from database
  const loadMostRecentProject = async () => {
    try {
      const mruProject = await projectAPI.getMostRecentlyUsedProject();
      setMostRecentProject(mruProject);
    } catch (error) {
      console.error('Failed to load most recent project:', error);
      setMostRecentProject(null);
    }
  };

  // Set active project and persist to localStorage
  const setActiveProject = (project: Project | null) => {
    setActiveProjectState(project);
    if (project && project.id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, project.id.toString());
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  };

  // Load projects and MRU project on mount
  useEffect(() => {
    loadProjects();
    loadMostRecentProject();
  }, []);

  const value: ProjectContextValue = {
    activeProject,
    setActiveProject,
    mostRecentProject,
    loadMostRecentProject,
    projects,
    loadProjects,
    loading
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};