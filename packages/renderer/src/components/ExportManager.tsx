import React, { useState } from 'react';
import CustomDropdown from './CustomDropdown';

// Access the export API via the global window object
declare global {
  interface Window {
    [key: string]: any;
  }
}

const getExportAPI = () => {
  // Find the export API in the global scope (exposed via preload)
  for (const key in window) {
    if (typeof window[key] === 'object' && (window[key]?.exportMonthlyData || window[key]?.exportData)) {
      return window[key];
    }
  }
  return null;
};

interface ExportOptions {
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  format: 'csv' | 'xlsx';
  reportType: 'project-breakdown' | 'all-logs';
}

interface ExportStatus {
  isExporting: boolean;
  progress: number;
  message: string;
  error: string | null;
}

const ExportManager: React.FC = () => {
  const currentDate = new Date();
  // Set default to current month range
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    startDate: firstDayOfMonth.toISOString().split('T')[0],
    endDate: lastDayOfMonth.toISOString().split('T')[0],
    format: 'csv',
    reportType: 'project-breakdown'
  });

  // Helper state for UI controls
  const [startMonth, setStartMonth] = useState(currentDate.getMonth() + 1);
  const [startYear, setStartYear] = useState(currentDate.getFullYear());
  const [endMonth, setEndMonth] = useState(currentDate.getMonth() + 1);
  const [endYear, setEndYear] = useState(currentDate.getFullYear());

  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    isExporting: false,
    progress: 0,
    message: '',
    error: null
  });


  // Generate years from 2020 to current year + 1
  const years = Array.from({ length: currentDate.getFullYear() - 2019 }, (_, i) => 2020 + i);
  
  // Month names
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Dropdown options
  const yearOptions = years.map(year => ({ value: year, label: year.toString() }));
  const monthOptions = months.map((month, index) => ({ value: index + 1, label: month }));
  const formatOptions = [
    { value: 'csv' as const, label: 'CSV (.csv)' },
    { value: 'xlsx' as const, label: 'Excel (.xlsx)' }
  ];
  
  const reportTypeOptions = [
    { value: 'project-breakdown' as const, label: 'Project Breakdown' },
    { value: 'all-logs' as const, label: 'All Time Logs' }
  ];

  // Helper functions to update date ranges when month/year selectors change
  const updateStartDate = (month: number, year: number) => {
    const firstDay = new Date(year, month - 1, 1);
    setStartMonth(month);
    setStartYear(year);
    setExportOptions(prev => ({
      ...prev,
      startDate: firstDay.toISOString().split('T')[0]
    }));
  };

  const updateEndDate = (month: number, year: number) => {
    const lastDay = new Date(year, month, 0); // Last day of the month
    setEndMonth(month);
    setEndYear(year);
    setExportOptions(prev => ({
      ...prev,
      endDate: lastDay.toISOString().split('T')[0]
    }));
  };

  const handleExport = async () => {
    const exportAPI = getExportAPI();
    if (!exportAPI) {
      setExportStatus({
        isExporting: false,
        progress: 0,
        message: '',
        error: 'Export API not available'
      });
      return;
    }

    setExportStatus({
      isExporting: true,
      progress: 0,
      message: 'Preparing export...',
      error: null
    });

    try {
      setExportStatus(prev => ({ ...prev, progress: 25, message: 'Gathering data...' }));
      
      // Use the new exportData method if available, fallback to exportMonthlyData
      const result = exportAPI.exportData 
        ? await exportAPI.exportData(exportOptions)
        : await exportAPI.exportMonthlyData(exportOptions);
      
      setExportStatus(prev => ({ ...prev, progress: 100 }));

      if (result.success) {
        setExportStatus(prev => ({ 
          ...prev, 
          message: result.filePath 
            ? `Export saved successfully to: ${result.filePath}` 
            : 'Export completed successfully!' 
        }));
      } else {
        setExportStatus({
          isExporting: false,
          progress: 0,
          message: '',
          error: result.error || 'Export failed'
        });
        return;
      }
      
      // Reset after 5 seconds
      setTimeout(() => {
        setExportStatus({
          isExporting: false,
          progress: 0,
          message: '',
          error: null
        });
      }, 5000);
    } catch (error) {
      setExportStatus({
        isExporting: false,
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'Export failed'
      });
    }
  };

  const formatDateRange = () => {
    const startMonthName = months[startMonth - 1];
    const endMonthName = months[endMonth - 1];
    
    if (startYear === endYear && startMonth === endMonth) {
      return `${startMonthName} ${startYear}`;
    } else {
      return `${startMonthName} ${startYear} to ${endMonthName} ${endYear}`;
    }
  };


  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Export Time Logs</h1>
          <p className="text-text/70">Export time logs and project breakdowns for any date range.</p>
        </div>

        <div className="bg-foreground/20 border border-foreground/30 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-semibold text-text mb-4">Export Options</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="grid grid-cols-2 gap-2">
              <CustomDropdown
                label="Start Month"
                value={startMonth}
                onChange={(month) => month && updateStartDate(month, startYear)}
                options={monthOptions}
              />
              <CustomDropdown
                label="Start Year"
                value={startYear}
                onChange={(year) => year && updateStartDate(startMonth, year)}
                options={yearOptions}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <CustomDropdown
                label="End Month"
                value={endMonth}
                onChange={(month) => month && updateEndDate(month, endYear)}
                options={monthOptions}
              />
              <CustomDropdown
                label="End Year"
                value={endYear}
                onChange={(year) => year && updateEndDate(endMonth, year)}
                options={yearOptions}
              />
            </div>

            <CustomDropdown
              label="Report Type"
              value={exportOptions.reportType}
              onChange={(reportType) => reportType && setExportOptions(prev => ({ ...prev, reportType }))}
              options={reportTypeOptions}
            />

            <CustomDropdown
              label="Format"
              value={exportOptions.format}
              onChange={(format) => format && setExportOptions(prev => ({ ...prev, format }))}
              options={formatOptions}
            />
          </div>

          {/* Export Summary */}
          <div className="bg-background/60 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-text mb-2">Export Summary</h3>
            <p className="text-text/70 text-sm">
              Exporting {formatDateRange()} data as{' '}
              <span className="font-medium">{reportTypeOptions.find(opt => opt.value === exportOptions.reportType)?.label}</span>{' '}
              in <span className="font-medium uppercase">{exportOptions.format}</span> format.
            </p>
          </div>

          {/* Export Status */}
          {(exportStatus.isExporting || exportStatus.message || exportStatus.error) && (
            <div className="bg-background/60 rounded-lg p-4 mb-4">
              {exportStatus.error ? (
                <div className="text-error">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Export Failed</span>
                  </div>
                  <p className="text-sm">{exportStatus.error}</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text">{exportStatus.message}</span>
                    {exportStatus.isExporting && (
                      <span className="text-sm text-text/70">{exportStatus.progress}%</span>
                    )}
                  </div>
                  {exportStatus.isExporting && (
                    <div className="w-full bg-secondary/30 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${exportStatus.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exportStatus.isExporting}
            className={`
              w-full px-6 py-3 rounded-lg font-medium transition-colors
              ${exportStatus.isExporting
                ? 'bg-secondary/50 text-text/50 cursor-not-allowed'
                : 'bg-primary text-background hover:bg-primary/90'
              }
            `}
          >
            {exportStatus.isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        {/* Export Information */}
        <div className="bg-foreground/20 border border-foreground/30 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-text mb-4">Export Information</h2>
          <div className="space-y-3 text-sm text-text/70">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <span className="font-medium">Project Breakdown:</span> Aggregated data showing total hours per project for the selected date range, sorted by hours descending.
              </p>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <span className="font-medium">All Time Logs:</span> Individual time entries with start/end times, duration, and project information for the selected date range.
              </p>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <span className="font-medium">Excel Format:</span> Includes multiple sheets with the main data and a Summary sheet with overview statistics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportManager;