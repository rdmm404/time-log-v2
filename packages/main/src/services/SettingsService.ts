import type {DatabaseModule, Setting} from '../modules/DatabaseModule.js';
import {app} from 'electron';

export class SettingsService {
  private db: DatabaseModule;

  constructor(db: DatabaseModule) {
    this.db = db;
  }

  async getSetting(key: string): Promise<string | null> {
    const database = this.db.getDatabase();
    const stmt = database.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const database = this.db.getDatabase();
    const stmt = database.prepare('SELECT key, value FROM settings');
    const results = stmt.all() as Array<{ key: string; value: string }>;

    const settings: Record<string, string> = {};
    for (const row of results) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const database = this.db.getDatabase();
    const now = new Date().toISOString();

    // Use INSERT OR REPLACE to handle both insert and update
    const stmt = database.prepare(`
      INSERT OR REPLACE INTO settings (key, value, created_at, updated_at)
      VALUES (?, ?,
        COALESCE((SELECT created_at FROM settings WHERE key = ?), ?),
        ?
      )
    `);

    const result = stmt.run(key, value, key, now, now);

    // Return the setting
    const getStmt = database.prepare("SELECT * FROM settings WHERE key = ?");
    const setting = getStmt.get(key) as Setting;

    // Handle startup setting special case
    if (key === "addToStartup") {
      await this.handleStartupSetting(value === "true");
    }

    return setting;
  }

  async deleteSetting(key: string): Promise<boolean> {
    const database = this.db.getDatabase();
    const stmt = database.prepare('DELETE FROM settings WHERE key = ?');
    const result = stmt.run(key);
    return result.changes > 0;
  }

  async getStartupSetting(): Promise<boolean> {
    const value = await this.getSetting('addToStartup');
    return value === 'true';
  }

  async setStartupSetting(enabled: boolean): Promise<void> {
    await this.setSetting('addToStartup', enabled.toString());
  }

  private async handleStartupSetting(enabled: boolean): Promise<void> {
    try {
      if (enabled) {
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: true
        });
      } else {
        app.setLoginItemSettings({
          openAtLogin: false
        });
      }
    } catch (error) {
      console.error('Failed to update startup setting:', error);
      throw new Error('Failed to update startup setting');
    }
  }

  // Initialize default settings
  async initializeDefaults(): Promise<void> {
    const existingSettings = await this.getAllSettings();

    // Set default for addToStartup if not exists
    if (!('addToStartup' in existingSettings)) {
      await this.setSetting('addToStartup', 'false');
    }
  }
}