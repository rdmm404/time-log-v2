/**
 * Timer and time-related utility functions
 */

export interface TimeFormatOptions {
  showHours?: boolean;
  showSeconds?: boolean;
  compact?: boolean;
}

/**
 * Format seconds into human-readable time string
 * @param seconds - Number of seconds to format
 * @param options - Formatting options
 * @returns Formatted time string (e.g., "01:30:45", "1h 30m", "90 min")
 */
export function formatDuration(seconds: number, options: TimeFormatOptions = {}): string {
  const {
    showHours = true,
    showSeconds = true,
    compact = false
  } = options;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (compact) {
    // Compact format: "1h 30m" or "30m" or "45s"
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${secs}s`;
  }

  // Standard format: "01:30:45" or "01:30"
  if (!showHours && hours === 0) {
    return showSeconds 
      ? `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes} min`;
  }

  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return showSeconds ? `${timeStr}:${secs.toString().padStart(2, '0')}` : timeStr;
}

/**
 * Parse time string back to seconds
 * @param timeStr - Time string in format "HH:MM:SS" or "HH:MM"
 * @returns Number of seconds
 */
export function parseDuration(timeStr: string): number {
  const parts = timeStr.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // HH:MM (assume no seconds)
    return parts[0] * 3600 + parts[1] * 60;
  }
  
  return 0;
}

/**
 * Calculate elapsed time between two dates
 * @param startTime - Start time as ISO string or Date
 * @param endTime - End time as ISO string or Date (defaults to now)
 * @returns Elapsed time in seconds
 */
export function calculateElapsedTime(
  startTime: string | Date, 
  endTime?: string | Date
): number {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

/**
 * Validate time range
 * @param startTime - Start time as ISO string
 * @param endTime - End time as ISO string
 * @returns Validation result
 */
export function validateTimeRange(startTime: string, endTime: string): {
  isValid: boolean;
  error?: string;
  duration?: number;
} {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (start >= end) {
    return { isValid: false, error: 'End time must be after start time' };
  }

  const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
  
  // Sanity check: no more than 24 hours
  if (duration > 24 * 3600) {
    return { isValid: false, error: 'Time log cannot exceed 24 hours' };
  }

  // Sanity check: at least 1 second
  if (duration < 1) {
    return { isValid: false, error: 'Time log must be at least 1 second' };
  }

  return { isValid: true, duration };
}

/**
 * Get formatted date string for display
 * @param date - Date as ISO string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = new Date(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString(undefined, defaultOptions);
}

/**
 * Get formatted time string for display
 * @param date - Date as ISO string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted time string
 */
export function formatTime(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = new Date(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return dateObj.toLocaleTimeString(undefined, defaultOptions);
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: string | Date): boolean {
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
}

/**
 * Get start and end of day for a given date
 * @param date - Date string or Date object
 * @returns Object with startOfDay and endOfDay as ISO strings
 */
export function getDayBounds(date: string | Date): {
  startOfDay: string;
  endOfDay: string;
} {
  const dateObj = new Date(date);
  
  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(dateObj);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString()
  };
}