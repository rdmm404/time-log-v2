import {app, dialog} from 'electron';
import {Database} from 'better-sqlite3';
import {promises as fs} from 'fs';
import {join, extname} from 'path';
import * as XLSX from 'xlsx';
import type {TimeLog, Project} from '../modules/DatabaseModule.js';

export interface ExportOptions {
  year: number;
  month: number;
  projectId: number | null;
  format: 'csv' | 'xlsx';
}

export interface ExportedTimeLog extends TimeLog {
  project_name: string | null;
  date: string;
  start_time_formatted: string;
  end_time_formatted: string;
  duration_formatted: string;
}

export interface DailyBreakdown {
  date: string;
  totalDuration: number;
  totalFormatted: string;
  logs: ExportedTimeLog[];
}

export interface ExportData {
  month: string;
  year: number;
  project: string;
  totalHours: number;
  totalFormatted: string;
  dailyBreakdowns: DailyBreakdown[];
  allLogs: ExportedTimeLog[];
}

export class ExportService {
  constructor(private db: Database) {}

  async exportMonthlyData(options: ExportOptions): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Get the export data
      const exportData = await this.getMonthlyData(options);
      
      if (exportData.allLogs.length === 0) {
        return { success: false, error: 'No time logs found for the selected criteria' };
      }

      // Generate filename and ask user where to save
      const defaultFileName = this.generateFileName(options, exportData.project);
      
      const result = await dialog.showSaveDialog({
        title: 'Save Export File',
        defaultPath: defaultFileName,
        filters: [
          options.format === 'csv' 
            ? { name: 'CSV files', extensions: ['csv'] }
            : { name: 'Excel files', extensions: ['xlsx'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled by user' };
      }

      // Generate and save the file
      if (options.format === 'csv') {
        await this.generateCSV(exportData, result.filePath);
      } else {
        await this.generateXLSX(exportData, result.filePath);
      }

      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Export failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown export error' 
      };
    }
  }

  private async getMonthlyData(options: ExportOptions): Promise<ExportData> {
    const { year, month, projectId } = options;
    
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Build the query
    let query = `
      SELECT 
        tl.*,
        p.name as project_name,
        DATE(tl.start_time) as date
      FROM time_logs tl
      LEFT JOIN projects p ON tl.project_id = p.id
      WHERE DATE(tl.start_time) >= ? AND DATE(tl.start_time) <= ?
        AND tl.end_time IS NOT NULL
    `;
    
    const params: any[] = [startDateStr, endDateStr];
    
    if (projectId !== null) {
      query += ' AND tl.project_id = ?';
      params.push(projectId);
    }
    
    query += ' ORDER BY tl.start_time';

    const stmt = this.db.prepare(query);
    const logs = stmt.all(...params) as Array<TimeLog & { project_name: string | null; date: string }>;

    // Format the logs
    const formattedLogs: ExportedTimeLog[] = logs.map(log => ({
      ...log,
      start_time_formatted: this.formatTime(log.start_time),
      end_time_formatted: this.formatTime(log.end_time!),
      duration_formatted: this.formatDuration(log.duration!)
    }));

    // Group by date for daily breakdowns
    const dailyBreakdowns: DailyBreakdown[] = [];
    const logsByDate: { [key: string]: ExportedTimeLog[] } = {};

    formattedLogs.forEach(log => {
      if (!logsByDate[log.date]) {
        logsByDate[log.date] = [];
      }
      logsByDate[log.date].push(log);
    });

    Object.entries(logsByDate).forEach(([date, dayLogs]) => {
      const totalDuration = dayLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      dailyBreakdowns.push({
        date,
        totalDuration,
        totalFormatted: this.formatDuration(totalDuration),
        logs: dayLogs
      });
    });

    // Sort daily breakdowns by date
    dailyBreakdowns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get project name
    let projectName = 'All Projects';
    if (projectId !== null) {
      const projectStmt = this.db.prepare('SELECT name FROM projects WHERE id = ?');
      const project = projectStmt.get(projectId) as { name: string } | undefined;
      projectName = project?.name || 'Unknown Project';
    }

    // Calculate total hours
    const totalDuration = formattedLogs.reduce((sum, log) => sum + (log.duration || 0), 0);

    return {
      month: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
      year,
      project: projectName,
      totalHours: totalDuration,
      totalFormatted: this.formatDuration(totalDuration),
      dailyBreakdowns,
      allLogs: formattedLogs
    };
  }

  private async generateCSV(data: ExportData, filePath: string): Promise<void> {
    const lines: string[] = [];
    
    // Header with metadata
    lines.push(`# Time Log Export - ${data.month} ${data.year}`);
    lines.push(`# Project: ${data.project}`);
    lines.push(`# Total Hours: ${data.totalFormatted}`);
    lines.push(`# Generated: ${new Date().toLocaleString()}`);
    lines.push('');

    // CSV headers
    lines.push('Date,Start Time,End Time,Duration,Description,Project');

    // Add all time logs
    data.allLogs.forEach(log => {
      const csvLine = [
        log.date,
        log.start_time_formatted,
        log.end_time_formatted,
        log.duration_formatted,
        `"${(log.description || '').replace(/"/g, '""')}"`, // Escape quotes in descriptions
        `"${(log.project_name || 'No Project').replace(/"/g, '""')}"`
      ].join(',');
      
      lines.push(csvLine);
    });

    // Add daily summary section
    lines.push('');
    lines.push('# Daily Summary');
    lines.push('Date,Total Duration');
    
    data.dailyBreakdowns.forEach(day => {
      lines.push(`${day.date},${day.totalFormatted}`);
    });

    // Write file
    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  }

  private async generateXLSX(data: ExportData, filePath: string): Promise<void> {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create Summary sheet
    const summaryData = [
      ['Time Log Export Summary'],
      [''],
      ['Month', data.month],
      ['Year', data.year.toString()],
      ['Project', data.project],
      ['Total Hours', data.totalFormatted],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['Daily Breakdown'],
      ['Date', 'Total Hours'],
    ];

    // Add daily breakdown data
    data.dailyBreakdowns.forEach(day => {
      summaryData.push([day.date, day.totalFormatted]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths for summary sheet
    summarySheet['!cols'] = [
      { width: 20 }, // Column A
      { width: 15 }  // Column B
    ];

    // Style the header row
    if (summarySheet['A1']) {
      summarySheet['A1'].s = {
        font: { bold: true, size: 14 },
        alignment: { horizontal: 'center' }
      };
    }

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create Time Logs sheet
    const timeLogsData = [
      ['Date', 'Start Time', 'End Time', 'Duration', 'Description', 'Project']
    ];

    data.allLogs.forEach(log => {
      timeLogsData.push([
        log.date,
        log.start_time_formatted,
        log.end_time_formatted,
        log.duration_formatted,
        log.description || '',
        log.project_name || 'No Project'
      ]);
    });

    const timeLogsSheet = XLSX.utils.aoa_to_sheet(timeLogsData);
    
    // Set column widths for time logs sheet
    timeLogsSheet['!cols'] = [
      { width: 12 }, // Date
      { width: 12 }, // Start Time
      { width: 12 }, // End Time
      { width: 10 }, // Duration
      { width: 30 }, // Description
      { width: 15 }  // Project
    ];

    // Style the header row
    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(cell => {
      if (timeLogsSheet[cell]) {
        timeLogsSheet[cell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E0E0E0' } },
          alignment: { horizontal: 'center' }
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, timeLogsSheet, 'Time Logs');

    // Create Daily Breakdown sheet with more details
    if (data.dailyBreakdowns.length > 0) {
      const dailyData = [
        ['Daily Time Log Breakdown'],
        ['']
      ];

      data.dailyBreakdowns.forEach(day => {
        dailyData.push([`Date: ${day.date}`, `Total: ${day.totalFormatted}`]);
        dailyData.push(['Start Time', 'End Time', 'Duration', 'Description', 'Project']);
        
        day.logs.forEach(log => {
          dailyData.push([
            log.start_time_formatted,
            log.end_time_formatted,
            log.duration_formatted,
            log.description || '',
            log.project_name || 'No Project'
          ]);
        });
        
        dailyData.push(['']); // Empty row between days
      });

      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
      
      // Set column widths
      dailySheet['!cols'] = [
        { width: 12 }, // Start Time / Date
        { width: 12 }, // End Time / Total
        { width: 10 }, // Duration
        { width: 30 }, // Description
        { width: 15 }  // Project
      ];

      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Breakdown');
    }

    // Write the file
    XLSX.writeFile(workbook, filePath);
  }

  private generateFileName(options: ExportOptions, projectName: string): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthName = monthNames[options.month - 1];
    const projectPart = projectName === 'All Projects' ? 'All' : projectName.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `TimeLog_${monthName}_${options.year}_${projectPart}.${options.format}`;
  }

  private formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  private formatDuration(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  }
}