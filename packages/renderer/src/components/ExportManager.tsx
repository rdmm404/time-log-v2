import React, { useState } from 'react';

// Access the export API via the global window object
declare global {
  interface Window {
    [key: string]: any;
  }
}

const getExportAPI = () => {
  // Find the export API in the global scope (exposed via preload)
  for (const key in window) {
    if (typeof window[key] === 'object' && window[key]?.exportMonthlyData) {
      return window[key];
    }
  }
  return null;
};

interface ExportOptions {
  year: number;
  month: number;
  format: 'csv' | 'xlsx';
}

interface ExportStatus {
  isExporting: boolean;
  progress: number;
  message: string;
  error: string | null;
}

const ExportManager: React.FC = () => {
  const currentDate = new Date();
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1, // JavaScript months are 0-indexed
    format: 'csv'
  });

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
      
      const result = await exportAPI.exportMonthlyData(exportOptions);
      
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

  const getSelectedMonthName = () => {
    return months[exportOptions.month - 1];
  };


  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Export Time Logs</h1>
          <p className="text-text/70">Export a monthly breakdown of hours per project for the selected month.</p>
        </div>

        <div className="bg-foreground rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-semibold text-text mb-4">Export Options</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Year Selector */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-text mb-2">
                Year
              </label>
              <select
                id="year"
                value={exportOptions.year}
                onChange={(e) => setExportOptions(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-secondary/30 rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-text mb-2">
                Month
              </label>
              <select
                id="month"
                value={exportOptions.month}
                onChange={(e) => setExportOptions(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-secondary/30 rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {months.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>


            {/* Format Selector */}
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-text mb-2">
                Format
              </label>
              <select
                id="format"
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({ 
                  ...prev, 
                  format: e.target.value as 'csv' | 'xlsx' 
                }))}
                className="w-full px-3 py-2 border border-secondary/30 rounded-lg bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="csv">CSV (.csv)</option>
                <option value="xlsx">Excel (.xlsx)</option>
              </select>
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-background rounded-lg p-4 mb-4">
            <h3 className="font-medium text-text mb-2">Export Summary</h3>
            <p className="text-text/70 text-sm">
              Exporting {getSelectedMonthName()} {exportOptions.year} data with hours breakdown per project as{' '}
              <span className="font-medium uppercase">{exportOptions.format}</span> format.
            </p>
          </div>

          {/* Export Status */}
          {(exportStatus.isExporting || exportStatus.message || exportStatus.error) && (
            <div className="bg-background rounded-lg p-4 mb-4">
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
        <div className="bg-foreground rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-text mb-4">Export Information</h2>
          <div className="space-y-3 text-sm text-text/70">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <span className="font-medium">CSV Format:</span> Includes columns for project, project_description, hours, and month - showing total hours per project.
              </p>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <span className="font-medium">Excel Format:</span> Includes a Project Breakdown sheet with the main data and a Summary sheet with overview statistics.
              </p>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <span className="font-medium">Project Summary:</span> Hours are calculated as the total time logged for each project during the selected month, sorted by hours descending.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportManager;