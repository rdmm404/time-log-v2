import {ipcMain} from 'electron';
import type {TimeLogService} from '../services/TimeLogService.js';
import type {TimeLog} from '../modules/DatabaseModule.js';

export function setupDatabaseHandlers(timeLogService: TimeLogService) {
  // Timer operations
  ipcMain.handle('timer:start', async (_, description?: string, projectId?: number) => {
    try {
      return await timeLogService.startTimer(description, projectId);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to start timer');
    }
  });

  ipcMain.handle('timer:stop', async (_, description?: string) => {
    try {
      return await timeLogService.stopTimer(description);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to stop timer');
    }
  });

  ipcMain.handle('timer:getActive', async () => {
    try {
      return await timeLogService.getActiveTimeLog();
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
}