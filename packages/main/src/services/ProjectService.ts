import type Database from 'better-sqlite3';
import type {Project} from '../modules/DatabaseModule.js';

export class ProjectService {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
  }

  // Create a new project
  createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Project {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      project.name,
      project.description,
      project.color,
      now,
      now
    );

    return this.getProjectById(result.lastInsertRowid as number)!;
  }

  // Get project by ID
  getProjectById(id: number): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id) as Project | null;
  }

  // Get all projects
  getAllProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY name ASC');
    return stmt.all() as Project[];
  }

  // Update a project
  updateProject(id: number, updates: Partial<Project>): Project | null {
    const validFields = ['name', 'description', 'color'];
    const updateFields = Object.keys(updates).filter(key => validFields.includes(key));
    
    if (updateFields.length === 0) {
      return this.getProjectById(id);
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updates[field as keyof Project]);
    
    // Add updated_at timestamp
    const query = `UPDATE projects SET ${setClause}, updated_at = ? WHERE id = ?`;
    values.push(new Date().toISOString(), id);

    const stmt = this.db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.getProjectById(id);
  }

  // Delete a project
  deleteProject(id: number): boolean {
    // First check if any time logs are using this project
    const timeLogsCount = this.getTimeLogsCountForProject(id);
    if (timeLogsCount > 0) {
      throw new Error(`Cannot delete project: ${timeLogsCount} time log entries are using this project`);
    }

    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Get count of time logs using a specific project
  getTimeLogsCountForProject(projectId: number): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM time_logs WHERE project_id = ?');
    const result = stmt.get(projectId) as {count: number};
    return result.count;
  }

  // Check if project name already exists (for uniqueness validation)
  isProjectNameExists(name: string, excludeId?: number): boolean {
    let query = 'SELECT COUNT(*) as count FROM projects WHERE LOWER(name) = LOWER(?)';
    const params: (string | number)[] = [name];
    
    if (excludeId !== undefined) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as {count: number};
    return result.count > 0;
  }

  // Get projects with time log statistics
  getProjectsWithStats(): Array<Project & {totalDuration: number, timeLogCount: number}> {
    const stmt = this.db.prepare(`
      SELECT 
        p.*,
        COALESCE(SUM(tl.duration), 0) as totalDuration,
        COUNT(tl.id) as timeLogCount
      FROM projects p
      LEFT JOIN time_logs tl ON p.id = tl.project_id AND tl.duration IS NOT NULL
      GROUP BY p.id
      ORDER BY p.name ASC
    `);
    
    return stmt.all() as Array<Project & {totalDuration: number, timeLogCount: number}>;
  }

  // Get the most recently used project from time logs (including null/no project)
  getMostRecentlyUsedProject(): Project | null {
    // First get the most recent time log's project_id (could be null)
    const recentLogStmt = this.db.prepare(`
      SELECT project_id FROM time_logs
      ORDER BY start_time DESC
      LIMIT 1
    `);
    
    const recentLog = recentLogStmt.get() as {project_id: number | null} | undefined;
    
    if (!recentLog) {
      return null; // No time logs exist
    }
    
    if (recentLog.project_id === null) {
      return null; // Most recent was "No project"
    }
    
    // Get the actual project details
    return this.getProjectById(recentLog.project_id);
  }
}