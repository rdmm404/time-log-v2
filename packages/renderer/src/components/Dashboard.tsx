import React, { useEffect, useState } from 'react';
import { timeLogAPI, type TimeLog } from '@app/preload';
import TimerApp from './TimerApp';
import { useTimer } from '../contexts/TimerContext';

interface DashboardStats {
  todayDuration: number;
  todayLogs: TimeLog[];
  recentDays: Array<{
    date: string;
    duration: number;
    formattedDate: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todayDuration: 0,
    todayLogs: [],
    recentDays: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state, formatElapsedTime } = useTimer();

  // Format duration from seconds to HH:MM:SS
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's data
      const [todayDuration, todayLogs] = await Promise.all([
        timeLogAPI.getTodaysDuration(),
        timeLogAPI.getTodaysTimeLogs()
      ]);

      // Get past 6 days data (excluding today)
      const recentDays = [];
      const today = new Date();
      
      for (let i = 1; i <= 6; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const duration = await timeLogAPI.getDateDuration(dateStr);
        recentDays.push({
          date: dateStr,
          duration,
          formattedDate: formatDate(dateStr)
        });
      }

      setStats({
        todayDuration,
        todayLogs,
        recentDays
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when timer state changes
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refresh data when timer stops (to update today's total)
  useEffect(() => {
    if (!state.isRunning && !state.currentSession) {
      fetchDashboardData();
    }
  }, [state.isRunning, state.currentSession]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-slate-900">
        <div className="text-slate-600 dark:text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-slate-900">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  // Calculate total duration including current session
  const currentSessionTime = state.isRunning ? state.elapsedTime : 0;
  const totalTodayDuration = stats.todayDuration + currentSessionTime;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Time Tracker Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track your time efficiently and review your productivity
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timer Section - Takes up one column, spans both rows */}
          <div className="lg:col-span-1 lg:row-span-2">
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-lg h-full flex flex-col">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">
                Timer
              </h2>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-center">
                  <TimerApp />
                </div>
              </div>
            </div>
          </div>

          {/* Today's Summary - Takes up two columns, first row */}
          <div className="lg:col-span-2">
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-lg h-full">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Today's Summary
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Time</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatDuration(totalTodayDuration)}
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Sessions</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.todayLogs.filter(log => log.end_time).length}
                    {state.isRunning ? ` + 1 active` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Days - Takes up two columns, second row */}
          <div className="lg:col-span-2">
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-lg h-full">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Recent Days
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.recentDays.map((day) => (
                  <div 
                    key={day.date}
                    className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600 text-center"
                  >
                    <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                      {day.formattedDate}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {day.duration > 0 ? formatDuration(day.duration) : '0h 0m'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Time Logs */}
        {stats.todayLogs.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
              Today's Time Logs
            </h2>
            <div className="space-y-3">
              {stats.todayLogs.map((log) => (
                <div 
                  key={log.id}
                  className="bg-white dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(log.start_time).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      {log.end_time && ` - ${new Date(log.end_time).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}`}
                    </div>
                    <div className="text-slate-800 dark:text-slate-200">
                      {log.description || 'No description'}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {log.end_time && log.duration ? formatDuration(log.duration) : (
                      state.isRunning && state.currentSession?.id === log.id ? 
                      formatElapsedTime(state.elapsedTime) : 'Running...'
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;