import {app, dialog} from 'electron';
import {Database} from 'better-sqlite3';
import {promises as fs} from 'fs';
import {join, extname} from 'path';
import * as XLSX from 'xlsx';
import type {TimeLog, Project} from '../modules/DatabaseModule.js';

export interface ExportOptions {
  year: number;
  month: number;
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

  async exportMonthlyData(options: ExportOptions): Promise<{ success: boolean; filePath?: string; error?: string }> {
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

  private async getMonthlyData(options: ExportOptions): Promise<ExportData> {
    const { year, month } = options;
    
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

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
    const projectBreakdowns = projectStmt.all(startDateStr, endDateStr) as ProjectBreakdown[];

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
    const logs = logsStmt.all(startDateStr, endDateStr) as Array<TimeLog & { 
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

    return {
      month: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
      year,
      totalHours: totalDuration,
      totalFormatted: this.formatDuration(totalDuration),
      projectBreakdowns,
      allLogs: formattedLogs
    };
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

  private generateFileName(options: ExportOptions): string {
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