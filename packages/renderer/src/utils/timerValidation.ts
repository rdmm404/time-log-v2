/**
 * Timer validation utilities
 */

export interface TimerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TimerValidationOptions {
  maxDailyHours?: number;
  maxSessionHours?: number;
  allowOverlaps?: boolean;
  warnLongSessions?: boolean;
  longSessionThreshold?: number; // hours
}

const DEFAULT_VALIDATION_OPTIONS: Required<TimerValidationOptions> = {
  maxDailyHours: 16,
  maxSessionHours: 12,
  allowOverlaps: false,
  warnLongSessions: true,
  longSessionThreshold: 8
};

/**
 * Validate timer session parameters
 * @param description - Session description
 * @param projectId - Project ID (optional)
 * @returns Validation result
 */
export function validateTimerSession(
  description: string,
  projectId?: number | null
): TimerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Description validation
  if (description.length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }

  // Description suggestions
  if (description.length === 0) {
    warnings.push('Consider adding a description to track what you\'re working on');
  }

  // Project ID validation
  if (projectId !== null && projectId !== undefined) {
    if (projectId < 1 || !Number.isInteger(projectId)) {
      errors.push('Project ID must be a positive integer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate timer duration against business rules
 * @param durationSeconds - Duration in seconds
 * @param options - Validation options
 * @returns Validation result
 */
export function validateTimerDuration(
  durationSeconds: number,
  options: TimerValidationOptions = {}
): TimerValidationResult {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const hours = durationSeconds / 3600;

  // Duration bounds check
  if (durationSeconds < 1) {
    errors.push('Timer duration must be at least 1 second');
  }

  if (hours > opts.maxSessionHours) {
    errors.push(`Session cannot exceed ${opts.maxSessionHours} hours`);
  }

  // Long session warning
  if (opts.warnLongSessions && hours >= opts.longSessionThreshold) {
    warnings.push(`Long session detected (${Math.round(hours * 10) / 10}h). Consider taking breaks.`);
  }

  // Very short session warning
  if (durationSeconds < 60 && durationSeconds > 0) {
    warnings.push('Very short session (less than 1 minute). Was this intentional?');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate daily time total
 * @param dailyTotalSeconds - Total time for the day in seconds
 * @param options - Validation options
 * @returns Validation result
 */
export function validateDailyTotal(
  dailyTotalSeconds: number,
  options: TimerValidationOptions = {}
): TimerValidationResult {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const hours = dailyTotalSeconds / 3600;

  if (hours > opts.maxDailyHours) {
    errors.push(`Daily total cannot exceed ${opts.maxDailyHours} hours`);
  }

  // Overtime warning
  if (hours > 8) {
    warnings.push(`High daily total: ${Math.round(hours * 10) / 10} hours`);
  }

  // Productivity insights
  if (hours > 0 && hours < 2) {
    warnings.push('Low activity today. Every bit of progress counts!');
  } else if (hours >= 6 && hours <= 8) {
    warnings.push('Great productivity today!');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate timer state consistency
 * @param isRunning - Whether timer is currently running
 * @param currentSession - Current session data
 * @param elapsedTime - Elapsed time in seconds
 * @returns Validation result
 */
export function validateTimerState(
  isRunning: boolean,
  currentSession: any | null,
  elapsedTime: number
): TimerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // State consistency checks
  if (isRunning && !currentSession) {
    errors.push('Timer is running but no active session found');
  }

  if (!isRunning && currentSession) {
    warnings.push('Active session found but timer is not running');
  }

  if (isRunning && elapsedTime < 0) {
    errors.push('Invalid elapsed time for running timer');
  }

  // Session data validation
  if (currentSession) {
    if (!currentSession.start_time) {
      errors.push('Active session missing start time');
    } else {
      const startTime = new Date(currentSession.start_time);
      const now = new Date();
      
      if (startTime > now) {
        errors.push('Session start time is in the future');
      }
    }

    if (currentSession.end_time && isRunning) {
      warnings.push('Session has end time but timer is still running');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get validation summary message
 * @param result - Validation result
 * @returns Human-readable summary
 */
export function getValidationSummary(result: TimerValidationResult): string {
  if (!result.isValid) {
    return `Validation failed: ${result.errors.join(', ')}`;
  }

  if (result.warnings.length > 0) {
    return `Valid with warnings: ${result.warnings.join(', ')}`;
  }

  return 'Validation passed';
}

/**
 * Combine multiple validation results
 * @param results - Array of validation results
 * @returns Combined validation result
 */
export function combineValidationResults(
  results: TimerValidationResult[]
): TimerValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: [...new Set(allErrors)], // Remove duplicates
    warnings: [...new Set(allWarnings)] // Remove duplicates
  };
}