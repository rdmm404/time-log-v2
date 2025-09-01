import type {AppModule} from '../AppModule.js';
import type {ModuleContext} from '../ModuleContext.js';
import Database from 'better-sqlite3';
import {app} from 'electron';
import {join} from 'path';

export interface TimeLog {
  id?: number;
  start_time: string; // ISO string
  end_time: string | null; // ISO string or null for active sessions
  duration: number | null; // duration in seconds, null for active sessions
  description: string;
  project_id: number | null;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface Project {
  id?: number;
  name: string;
  description: string;
  color: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export class DatabaseModule implements AppModule {
  private db: Database.Database | null = null;

  async enable(context: ModuleContext): Promise<void> {
    const userDataPath = app.getPath('userData');
    const dbPath = join(userDataPath, 'timetracker.db');
    
    this.db = new Database(dbPath);
    
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
    this.db.pragma('temp_store = memory');
    
    this.createTables();
    
    console.log('Database initialized at:', dbPath);
  }

  // Initialize method for backwards compatibility and internal use
  async init(context: ModuleContext): Promise<void> {
    return this.enable(context);
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Create time_logs table
    const createTimeLogsTable = `
      CREATE TABLE IF NOT EXISTS time_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        description TEXT NOT NULL DEFAULT '',
        project_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
      )
    `;

    // Create projects table (for future use)
    const createProjectsTable = `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT '#3B82F6',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `;

    // Create indexes for better performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_time_logs_start_time ON time_logs(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_time_logs_project_id ON time_logs(project_id)',
      'CREATE INDEX IF NOT EXISTS idx_time_logs_end_time ON time_logs(end_time)'
    ];

    this.db.exec(createTimeLogsTable);
    this.db.exec(createProjectsTable);
    
    for (const indexQuery of createIndexes) {
      this.db.exec(indexQuery);
    }
  }

  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export function createDatabaseModule(): DatabaseModule {
  return new DatabaseModule();
}