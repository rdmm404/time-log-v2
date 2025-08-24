import {sha256sum} from './nodeCrypto.js';
import {versions} from './versions.js';
import {ipcRenderer} from 'electron';

function send(channel: string, message: string) {
  return ipcRenderer.invoke(channel, message);
}

// Time Log API for renderer
export interface TimeLog {
  id?: number;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  description: string;
  project_id: number | null;
  created_at: string;
  updated_at: string;
}

export const timeLogAPI = {
  // Timer operations
  startTimer: (description?: string, projectId?: number): Promise<TimeLog> =>
    ipcRenderer.invoke('timer:start', description, projectId),
  
  stopTimer: (description?: string): Promise<TimeLog> =>
    ipcRenderer.invoke('timer:stop', description),
  
  getActiveTimer: (): Promise<TimeLog | null> =>
    ipcRenderer.invoke('timer:getActive'),

  // CRUD operations
  createTimeLog: (timeLog: Omit<TimeLog, 'id' | 'created_at' | 'updated_at'>): Promise<TimeLog> =>
    ipcRenderer.invoke('timelog:create', timeLog),

  updateTimeLog: (id: number, updates: Partial<TimeLog>): Promise<TimeLog | null> =>
    ipcRenderer.invoke('timelog:update', id, updates),

  deleteTimeLog: (id: number): Promise<boolean> =>
    ipcRenderer.invoke('timelog:delete', id),

  getTimeLogById: (id: number): Promise<TimeLog | null> =>
    ipcRenderer.invoke('timelog:getById', id),

  // Query operations
  getTodaysTimeLogs: (): Promise<TimeLog[]> =>
    ipcRenderer.invoke('timelog:getToday'),

  getTimeLogsByDateRange: (startDate: string, endDate: string): Promise<TimeLog[]> =>
    ipcRenderer.invoke('timelog:getByDateRange', startDate, endDate),

  getTodaysDuration: (): Promise<number> =>
    ipcRenderer.invoke('timelog:getTodayDuration'),

  getDateDuration: (date: string): Promise<number> =>
    ipcRenderer.invoke('timelog:getDateDuration', date),

  getRecentTimeLogs: (limit?: number): Promise<TimeLog[]> =>
    ipcRenderer.invoke('timelog:getRecent', limit),
};

export {sha256sum, versions, send};
