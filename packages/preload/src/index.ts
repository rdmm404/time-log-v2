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

// System tray API
export const trayAPI = {
  startTimer: (): Promise<void> => ipcRenderer.invoke('tray-start-timer'),
  stopTimer: (): Promise<void> => ipcRenderer.invoke('tray-stop-timer'),
};

// System tray events
export const trayEvents = {
  onTimerStateUpdate: (callback: (timerState: any) => void) => {
    ipcRenderer.on('timer-state-update', (_, timerState) => callback(timerState));
    return () => ipcRenderer.removeAllListeners('timer-state-update');
  },
  
  onToggleTimer: (callback: () => void) => {
    ipcRenderer.on('tray-toggle-timer', callback);
    return () => ipcRenderer.removeAllListeners('tray-toggle-timer');
  },

  onRequestCurrentState: (callback: () => void) => {
    ipcRenderer.on('tray-request-current-state', callback);
    return () => ipcRenderer.removeAllListeners('tray-request-current-state');
  }
};

// Main window communication
export const mainWindowAPI = {
  onStartTimerFromTray: (callback: () => void) => {
    ipcRenderer.on('start-timer-from-tray', callback);
    return () => ipcRenderer.removeAllListeners('start-timer-from-tray');
  },
  
  onStopTimerFromTray: (callback: () => void) => {
    ipcRenderer.on('stop-timer-from-tray', callback);
    return () => ipcRenderer.removeAllListeners('stop-timer-from-tray');
  },
  
  sendTimerStateToTray: (timerState: any) => {
    ipcRenderer.send('timer-state-changed', timerState);
  }
};

export {sha256sum, versions, send};
