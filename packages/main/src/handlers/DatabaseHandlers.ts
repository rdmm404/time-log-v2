import {ipcMain} from 'electron';
import type {TimeLogService} from '../services/TimeLogService.js';
import type {ProjectService} from '../services/ProjectService.js';
import type {ExportService} from '../services/ExportService.js';
import type {MainProcessTimer} from '../services/MainProcessTimer.js';
import type {TimeLog, Project} from '../modules/DatabaseModule.js';
import type {ExportOptions} from '../services/ExportService.js';

export function setupDatabaseHandlers(timeLogService: TimeLogService, projectService: ProjectService, exportService: ExportService, mainProcessTimer: MainProcessTimer) {
  // Timer operations - use MainProcessTimer instead of direct service calls
  ipcMain.handle('timer:start', async (_, description?: string, projectId?: number) => {
    try {
      return await mainProcessTimer.startTimer(description, projectId);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to start timer');
    }
  });

  ipcMain.handle('timer:stop', async (_, description?: string) => {
    try {
      return await mainProcessTimer.stopTimer(description);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to stop timer');
    }
  });

  ipcMain.handle('timer:getActive', async () => {
    try {
      const state = mainProcessTimer.getState();
      return state.currentSession;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get active timer');
    }
  });

  // Time log CRUD operations
  ipcMain.handle('timelog:create', async (_, timeLog: Omit<TimeLog, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Validate if it's a completed time log
      if (timeLog.end_time) {
        timeLogService.validateTimeLog(timeLog.start_time, timeLog.end_time);
      }
      return await timeLogService.createTimeLog(timeLog);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create time log');
    }
  });

  ipcMain.handle('timelog:update', async (_, id: number, updates: Partial<TimeLog>) => {
    try {
      // Validate if updating times
      if (updates.start_time || updates.end_time) {
        const existing = timeLogService.getTimeLogById(id);
        if (existing) {
          const startTime = updates.start_time || existing.start_time;
          const endTime = updates.end_time !== undefined ? updates.end_time : existing.end_time;
          if (endTime) {
            timeLogService.validateTimeLog(startTime, endTime, id);
          }
        }
      }
      return await timeLogService.updateTimeLog(id, updates);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update time log');
    }
  });

  ipcMain.handle('timelog:delete', async (_, id: number) => {
    try {
      return await timeLogService.deleteTimeLog(id);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete time log');
    }
  });

  ipcMain.handle('timelog:getById', async (_, id: number) => {
    try {
      return await timeLogService.getTimeLogById(id);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get time log');
    }
  });

  // Query operations
  ipcMain.handle('timelog:getToday', async () => {
    try {
      return await timeLogService.getTodaysTimeLogs();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get today\'s time logs');
    }
  });

  ipcMain.handle('timelog:getByDateRange', async (_, startDate: string, endDate: string) => {
    try {
      return await timeLogService.getTimeLogsByDateRange(startDate, endDate);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get time logs by date range');
    }
  });

  ipcMain.handle('timelog:getTodayDuration', async () => {
    try {
      return await timeLogService.getTodaysTotalDuration();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get today\'s duration');
    }
  });

  ipcMain.handle('timelog:getDateDuration', async (_, date: string) => {
    try {
      return await timeLogService.getTotalDurationForDate(date);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get date duration');
    }
  });

  ipcMain.handle('timelog:getRecent', async (_, limit?: number) => {
    try {
      return await timeLogService.getRecentTimeLogs(limit);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get recent time logs');
    }
  });

  // Project CRUD operations
  ipcMain.handle('project:create', async (_, project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Check if project name already exists
      if (projectService.isProjectNameExists(project.name)) {
        throw new Error('A project with this name already exists');
      }
      return await projectService.createProject(project);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create project');
    }
  });

  ipcMain.handle('project:update', async (_, id: number, updates: Partial<Project>) => {
    try {
      // Check if project name already exists (excluding current project)
      if (updates.name && projectService.isProjectNameExists(updates.name, id)) {
        throw new Error('A project with this name already exists');
      }
      return await projectService.updateProject(id, updates);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update project');
    }
  });

  ipcMain.handle('project:delete', async (_, id: number) => {
    try {
      return await projectService.deleteProject(id);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete project');
    }
  });

  ipcMain.handle('project:getById', async (_, id: number) => {
    try {
      return await projectService.getProjectById(id);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get project');
    }
  });

  ipcMain.handle('project:getAll', async () => {
    try {
      return await projectService.getAllProjects();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get projects');
    }
  });

  ipcMain.handle('project:getAllWithStats', async () => {
    try {
      return await projectService.getProjectsWithStats();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get projects with stats');
    }
  });

  ipcMain.handle('project:getMostRecentlyUsed', async () => {
    try {
      return await projectService.getMostRecentlyUsedProject();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get most recently used project');
    }
  });

  // Export operations
  ipcMain.handle('export:monthly', async (_, options: ExportOptions) => {
    try {
      return await exportService.exportMonthlyData(options);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to export data');
    }
  });
}