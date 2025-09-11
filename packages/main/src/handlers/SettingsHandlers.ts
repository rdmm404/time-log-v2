import {ipcMain} from 'electron';
import type {SettingsService} from '../services/SettingsService.js';

export function setupSettingsHandlers(settingsService: SettingsService) {
  // Get all settings
  ipcMain.handle('settings:getAll', async () => {
    try {
      return await settingsService.getAllSettings();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get settings');
    }
  });

  // Get a specific setting
  ipcMain.handle('settings:get', async (_, key: string) => {
    try {
      return await settingsService.getSetting(key);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get setting');
    }
  });

  // Set a setting
  ipcMain.handle('settings:set', async (_, key: string, value: string) => {
    try {
      return await settingsService.setSetting(key, value);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to set setting');
    }
  });

  // Delete a setting
  ipcMain.handle('settings:delete', async (_, key: string) => {
    try {
      return await settingsService.deleteSetting(key);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete setting');
    }
  });

  // Startup setting specific handlers
  ipcMain.handle('settings:getStartup', async () => {
    try {
      return await settingsService.getStartupSetting();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get startup setting');
    }
  });

  ipcMain.handle('settings:setStartup', async (_, enabled: boolean) => {
    try {
      await settingsService.setStartupSetting(enabled);
      return true;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to set startup setting');
    }
  });
}