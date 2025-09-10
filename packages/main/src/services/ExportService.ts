import {app, dialog} from 'electron';
import {Database} from 'better-sqlite3';
import {promises as fs} from 'fs';
import {join, extname} from 'path';
import * as XLSX from 'xlsx';
import type {TimeLog, Project} from '../modules/DatabaseModule.js';

export interface ExportOptions {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  format: 'csv' | 'xlsx';
  reportType: 'project-breakdown' | 'all-logs';
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

export interface ProjectBreakdown {
  project: string;
  project_description: string;
  hours: number;
  month: number;
}

export interface ExportData {
  month: string;
  year: number;
  totalHours: number;
  totalFormatted: string;
  projectBreakdowns: ProjectBreakdown[];
  allLogs: ExportedTimeLog[];
}

export class ExportService {
  constructor(private db: Database) {}

  async exportData(options: ExportOptions): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Get the export data based on report type
      const exportData = options.reportType === 'project-breakdown' 
        ? await this.getProjectBreakdownData(options)
        : await this.getAllLogsData(options);
      
      if (exportData.allLogs.length === 0) {
        return { success: false, error: 'No time logs found for the selected criteria' };
      }

      // Generate filename and ask user where to save
      const defaultFileName = this.generateFileNameForRange(options);
      
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

      // Generate and save the file based on report type
      if (options.reportType === 'project-breakdown') {
        if (options.format === 'csv') {
          await this.generateCSV(exportData, result.filePath);
        } else {
          await this.generateXLSX(exportData, result.filePath);
        }
      } else {
        if (options.format === 'csv') {
          await this.generateAllLogsCSV(exportData, result.filePath);
        } else {
          await this.generateAllLogsXLSX(exportData, result.filePath);
        }
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

  // Legacy method for backward compatibility
  async exportMonthlyData(options: { year: number; month: number; format: 'csv' | 'xlsx' }): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Get the export data
      const exportData = await this.getMonthlyData(options);
      
      if (exportData.allLogs.length === 0) {
        return { success: false, error: 'No time logs found for the selected criteria' };
      }

      // Generate filename and ask user where to save
      const defaultFileName = this.generateFileName(options);
      
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

  private async getProjectBreakdownData(options: ExportOptions): Promise<ExportData> {
    const { startDate, endDate } = options;

    // Use SQL aggregation query for accurate project breakdown
    const projectQuery = `
      SELECT
        COALESCE(p.name, 'No Project') AS project,
        COALESCE(p.description, '') AS project_description,
        ROUND(
          SUM((JULIANDAY(tl.end_time) - JULIANDAY(tl.start_time)) * 24.0),
          2
        ) AS hours,
        STRFTIME('%Y-%m', tl.start_time) AS month
      FROM time_logs AS tl
      LEFT JOIN projects AS p ON p.id = tl.project_id
      WHERE tl.end_time IS NOT NULL
      AND DATE(tl.start_time) >= ? AND DATE(tl.start_time) <= ?
      GROUP BY
        p.id,
        p.name,
        p.description,
        CAST(STRFTIME('%m', tl.start_time) AS INTEGER)
      ORDER BY p.name, month
    `;

    const projectStmt = this.db.prepare(projectQuery);
    const projectBreakdowns = projectStmt.all(startDate, endDate) as ProjectBreakdown[];

    // Get individual logs for allLogs (for potential future use)
    const logsQuery = `
      SELECT 
        tl.*,
        p.name as project_name,
        p.description as project_description,
        DATE(tl.start_time) as date
      FROM time_logs tl
      LEFT JOIN projects p ON tl.project_id = p.id
      WHERE DATE(tl.start_time) >= ? AND DATE(tl.start_time) <= ?
        AND tl.end_time IS NOT NULL
      ORDER BY tl.start_time
    `;

    const logsStmt = this.db.prepare(logsQuery);
    const logs = logsStmt.all(startDate, endDate) as Array<TimeLog & { 
      project_name: string | null; 
      project_description: string | null; 
      date: string 
    }>;

    // Format the logs
    const formattedLogs: ExportedTimeLog[] = logs.map(log => ({
      ...log,
      start_time_formatted: this.formatTime(log.start_time),
      end_time_formatted: this.formatTime(log.end_time!),
      duration_formatted: this.formatDuration(log.duration!)
    }));

    // Calculate total hours from project breakdowns
    const totalHours = projectBreakdowns.reduce((sum, project) => sum + project.hours, 0);
    const totalDuration = totalHours * 60 * 60 * 1000; // Convert back to ms for formatDuration

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    return {
      month: this.formatDateRange(startDateObj, endDateObj),
      year: startDateObj.getFullYear(),
      totalHours: totalDuration,
      totalFormatted: this.formatDuration(totalDuration),
      projectBreakdowns,
      allLogs: formattedLogs
    };
  }

  private async getAllLogsData(options: ExportOptions): Promise<ExportData> {
    const { startDate, endDate } = options;

    // Get all individual logs for the date range
    const logsQuery = `
      SELECT 
        tl.*,
        p.name as project_name,
        p.description as project_description,
        DATE(tl.start_time) as date
      FROM time_logs tl
      LEFT JOIN projects p ON tl.project_id = p.id
      WHERE DATE(tl.start_time) >= ? AND DATE(tl.start_time) <= ?
        AND tl.end_time IS NOT NULL
      ORDER BY tl.start_time
    `;

    const logsStmt = this.db.prepare(logsQuery);
    const logs = logsStmt.all(startDate, endDate) as Array<TimeLog & { 
      project_name: string | null; 
      project_description: string | null; 
      date: string 
    }>;

    // Format the logs
    const formattedLogs: ExportedTimeLog[] = logs.map(log => ({
      ...log,
      start_time_formatted: this.formatTime(log.start_time),
      end_time_formatted: this.formatTime(log.end_time!),
      duration_formatted: this.formatDuration(log.duration!)
    }));

    // Calculate total hours
    const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    return {
      month: this.formatDateRange(startDateObj, endDateObj),
      year: startDateObj.getFullYear(),
      totalHours: totalDuration,
      totalFormatted: this.formatDuration(totalDuration),
      projectBreakdowns: [], // Not used for all-logs report
      allLogs: formattedLogs
    };
  }

  // Legacy method for backward compatibility - keep the original getMonthlyData method
  private async getMonthlyData(options: { year: number; month: number }): Promise<ExportData> {
    const { year, month } = options;
    
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Convert to new format and call getProjectBreakdownData
    return this.getProjectBreakdownData({
      startDate: startDateStr,
      endDate: endDateStr,
      format: 'csv',
      reportType: 'project-breakdown'
    });
  }

  private async generateCSV(data: ExportData, filePath: string): Promise<void> {
    const lines: string[] = [];
    
    // CSV headers matching the example format
    lines.push('project,project_description,hours,month');

    // Add project breakdowns
    data.projectBreakdowns.forEach(breakdown => {
      const csvLine = [
        `"${breakdown.project.replace(/"/g, '""')}"`, // Escape quotes in project names
        `"${breakdown.project_description.replace(/"/g, '""')}"`, // Escape quotes in descriptions
        breakdown.hours.toString(),
        breakdown.month.toString()
      ].join(',');
      
      lines.push(csvLine);
    });

    // Write file
    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  }

  private async generateXLSX(data: ExportData, filePath: string): Promise<void> {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create Project Breakdown sheet (main data)
    const projectData = [
      ['project', 'project_description', 'hours', 'month']
    ];

    data.projectBreakdowns.forEach(breakdown => {
      projectData.push([
        breakdown.project,
        breakdown.project_description,
        breakdown.hours.toString(),
        breakdown.month.toString()
      ]);
    });

    const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
    
    // Set column widths for project sheet
    projectSheet['!cols'] = [
      { width: 20 }, // Project
      { width: 30 }, // Description
      { width: 10 }, // Hours
      { width: 8 }   // Month
    ];

    // Style the header row
    ['A1', 'B1', 'C1', 'D1'].forEach(cell => {
      if (projectSheet[cell]) {
        projectSheet[cell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E0E0E0' } },
          alignment: { horizontal: 'center' }
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Breakdown');

    // Create Summary sheet
    const summaryData = [
      ['Time Log Export Summary'],
      [''],
      ['Month', data.month],
      ['Year', data.year.toString()],
      ['Total Hours', data.totalFormatted],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['Project Summary'],
      ['Project', 'Hours'],
    ];

    // Add project summary data
    data.projectBreakdowns.forEach(breakdown => {
      summaryData.push([breakdown.project, breakdown.hours.toString()]);
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

    // Write the file
    XLSX.writeFile(workbook, filePath);
  }

  private async generateAllLogsCSV(data: ExportData, filePath: string): Promise<void> {
    const lines: string[] = [];
    
    // CSV headers for all logs
    lines.push('date,project,start_time,end_time,duration,description');

    // Add individual log entries
    data.allLogs.forEach(log => {
      const csvLine = [
        log.date,
        `"${(log.project_name || 'No Project').replace(/"/g, '""')}"`,
        log.start_time_formatted,
        log.end_time_formatted,
        log.duration_formatted,
        `"${(log.description || '').replace(/"/g, '""')}"`
      ].join(',');
      
      lines.push(csvLine);
    });

    // Write file
    await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  }

  private async generateAllLogsXLSX(data: ExportData, filePath: string): Promise<void> {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create All Logs sheet (main data)
    const logsData = [
      ['Date', 'Project', 'Start Time', 'End Time', 'Duration', 'Description']
    ];

    data.allLogs.forEach(log => {
      logsData.push([
        log.date,
        log.project_name || 'No Project',
        log.start_time_formatted,
        log.end_time_formatted,
        log.duration_formatted,
        log.description || ''
      ]);
    });

    const logsSheet = XLSX.utils.aoa_to_sheet(logsData);
    
    // Set column widths for logs sheet
    logsSheet['!cols'] = [
      { width: 12 }, // Date
      { width: 20 }, // Project
      { width: 12 }, // Start Time
      { width: 12 }, // End Time
      { width: 10 }, // Duration
      { width: 30 }  // Description
    ];

    // Style the header row
    ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(cell => {
      if (logsSheet[cell]) {
        logsSheet[cell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E0E0E0' } },
          alignment: { horizontal: 'center' }
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, logsSheet, 'All Time Logs');

    // Create Summary sheet
    const summaryData = [
      ['Time Log Export Summary'],
      [''],
      ['Date Range', data.month],
      ['Report Type', 'All Time Logs'],
      ['Total Entries', data.allLogs.length.toString()],
      ['Total Time', data.totalFormatted],
      ['Generated', new Date().toLocaleString()],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths for summary sheet
    summarySheet['!cols'] = [
      { width: 20 }, // Column A
      { width: 25 }  // Column B
    ];

    // Style the header row
    if (summarySheet['A1']) {
      summarySheet['A1'].s = {
        font: { bold: true, size: 14 },
        alignment: { horizontal: 'center' }
      };
    }

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Write the file
    XLSX.writeFile(workbook, filePath);
  }

  private generateFileNameForRange(options: ExportOptions): string {
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    };
    
    const reportTypeLabel = options.reportType === 'project-breakdown' ? 'ProjectBreakdown' : 'AllLogs';
    const dateRange = formatDate(startDate) === formatDate(endDate) 
      ? formatDate(startDate) 
      : `${formatDate(startDate)}_to_${formatDate(endDate)}`;
    
    return `TimeLog_${dateRange}_${reportTypeLabel}.${options.format}`;
  }

  private formatDateRange(startDate: Date, endDate: Date): string {
    const formatOptions: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long' 
    };
    
    const start = startDate.toLocaleDateString(undefined, formatOptions);
    const end = endDate.toLocaleDateString(undefined, formatOptions);
    
    if (start === end) {
      return start;
    } else {
      return `${start} to ${end}`;
    }
  }

  // Legacy method for backward compatibility
  private generateFileName(options: { year: number; month: number; format: string }): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthName = monthNames[options.month - 1];
    
    return `TimeLog_${monthName}_${options.year}_ProjectBreakdown.${options.format}`;
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