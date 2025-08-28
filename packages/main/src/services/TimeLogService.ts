import type Database from 'better-sqlite3';
import type {TimeLog} from '../modules/DatabaseModule.js';

export class TimeLogService {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  // Create a new time log entry
  createTimeLog(timeLog: Omit<TimeLog, 'id' | 'created_at' | 'updated_at'>): TimeLog {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO time_logs (start_time, end_time, duration, description, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      timeLog.start_time,
      timeLog.end_time,
      timeLog.duration,
      timeLog.description,
      timeLog.project_id,
      now,
      now
    );

    return this.getTimeLogById(result.lastInsertRowid as number)!;
  }

  // Start a new timer session
  startTimer(description = '', projectId: number | null = null): TimeLog {
    // Check if there's already an active session
    const activeSession = this.getActiveTimeLog();
    if (activeSession) {
      throw new Error('Timer is already running. Stop the current timer before starting a new one.');
    }

    const startTime = new Date().toISOString();
    
    return this.createTimeLog({
      start_time: startTime,
      end_time: null,
      duration: null,
      description,
      project_id: projectId
    });
  }

  // Stop the currently active timer
  stopTimer(description?: string): TimeLog | null {
    const activeSession = this.getActiveTimeLog();
    if (!activeSession) {
      throw new Error('No active timer session found');
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(activeSession.start_time);
    const duration = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / 1000);

    const updateData: Partial<TimeLog> = {
      end_time: endTime,
      duration,
      updated_at: new Date().toISOString()
    };

    if (description !== undefined) {
      updateData.description = description;
    }

    return this.updateTimeLog(activeSession.id!, updateData);
  }

  // Get the currently active time log (no end_time)
  getActiveTimeLog(): TimeLog | null {
    const stmt = this.db.prepare('SELECT * FROM time_logs WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1');
    return stmt.get() as TimeLog | null;
  }

  // Get time log by ID
  getTimeLogById(id: number): TimeLog | null {
    const stmt = this.db.prepare('SELECT * FROM time_logs WHERE id = ?');
    return stmt.get(id) as TimeLog | null;
  }

  // Update a time log entry
  updateTimeLog(id: number, updates: Partial<TimeLog>): TimeLog | null {
    const validFields = ['start_time', 'end_time', 'duration', 'description', 'project_id'];
    const updateFields = Object.keys(updates).filter(key => validFields.includes(key));
    
    if (updateFields.length === 0) {
      return this.getTimeLogById(id);
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updates[field as keyof TimeLog]);
    
    // Add updated_at timestamp
    const query = `UPDATE time_logs SET ${setClause}, updated_at = ? WHERE id = ?`;
    values.push(new Date().toISOString(), id);

    const stmt = this.db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.getTimeLogById(id);
  }

  // Delete a time log entry
  deleteTimeLog(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM time_logs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Get time logs for a specific date range
  getTimeLogsByDateRange(startDate: string, endDate: string): TimeLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM time_logs 
      WHERE DATE(start_time) >= DATE(?) AND DATE(start_time) <= DATE(?)
      ORDER BY start_time DESC
    `);
    return stmt.all(startDate, endDate) as TimeLog[];
  }

  // Get time logs for today
  getTodaysTimeLogs(): TimeLog[] {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    return this.getTimeLogsByDateRange(today, today);
  }

  // Get total duration for a specific date
  getTotalDurationForDate(date: string): number {
    const stmt = this.db.prepare(`
      SELECT SUM(duration) as total 
      FROM time_logs 
      WHERE DATE(start_time) = DATE(?) AND duration IS NOT NULL
    `);
    const result = stmt.get(date) as {total: number | null};
    return result.total || 0;
  }

  // Get total duration for today
  getTodaysTotalDuration(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.getTotalDurationForDate(today);
  }

  // Validate time log data to prevent overlaps
  validateTimeLog(startTime: string, endTime: string | null, excludeId?: number): boolean {
    if (!endTime) return true; // Active sessions don't need validation

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new Error('End time must be after start time');
    }

    // Check for overlapping sessions
    let query = `
      SELECT COUNT(*) as count FROM time_logs 
      WHERE id != ? AND end_time IS NOT NULL
      AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(
      excludeId || -1,
      startTime, startTime,
      endTime, endTime,
      startTime, endTime
    ) as {count: number};

    if (result.count > 0) {
      throw new Error('Time log overlaps with existing entries');
    }

    return true;
  }

  // Get recent time logs (last N entries)
  getRecentTimeLogs(limit = 10): TimeLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM time_logs 
      ORDER BY start_time DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as TimeLog[];
  }
}