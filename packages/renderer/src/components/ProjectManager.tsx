import React, { useState, useEffect } from 'react';
import { projectAPI } from '@app/preload';
import { ProjectEditModal } from './ProjectEditModal';
import type { Project } from '@app/preload';

const ProjectManager: React.FC = () => {
  const [projects, setProjects] = useState<Array<Project & {totalDuration: number, timeLogCount: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsData = await projectAPI.getAllProjectsWithStats();
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsEditModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await projectAPI.deleteProject(id);
      await loadProjects();
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleModalClose = async (projectSaved: boolean) => {
    setIsEditModalOpen(false);
    setEditingProject(null);
    if (projectSaved) {
      await loadProjects();
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text/60">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Projects</h1>
        <button
          onClick={handleCreateProject}
          className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Project</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-text/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-text/70 mb-2">No projects yet</h3>
          <p className="text-text/50 mb-4">Create your first project to organize your time tracking</p>
          <button
            onClick={handleCreateProject}
            className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors duration-200"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="bg-foreground/30 rounded-lg p-4 border border-foreground/20">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: project.color }}
                  />
                  <h3 className="font-medium text-text truncate">{project.name}</h3>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditProject(project)}
                    className="p-1 text-text/60 hover:text-text hover:bg-foreground/50 rounded"
                    title="Edit project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => setDeleteConfirmId(project.id || null)}
                    className="p-1 text-text/60 hover:text-error hover:bg-error/10 rounded"
                    title="Delete project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {project.description && (
                <p className="text-text/70 text-sm mb-3 line-clamp-2">{project.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text/60">Total time:</span>
                  <span className="text-text font-medium">{formatDuration(project.totalDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text/60">Time entries:</span>
                  <span className="text-text font-medium">{project.timeLogCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-foreground/20 rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-medium text-text mb-4">Delete Project</h3>
            <p className="text-text/70 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-text/70 hover:text-text border border-foreground/20 hover:border-foreground/40 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirmId)}
                className="px-4 py-2 bg-error text-white hover:bg-error/90 rounded-lg transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isEditModalOpen && (
        <ProjectEditModal
          project={editingProject}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default ProjectManager;