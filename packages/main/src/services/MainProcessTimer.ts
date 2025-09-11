import { EventEmitter } from 'events';
import { TimeLogService } from './TimeLogService.js';
import { ProjectService } from './ProjectService.js';
import type { TimeLog } from '../../../preload/src/index.js';

export interface TimerState {
  isRunning: boolean;
  currentSession: TimeLog | null;
  elapsedTime: number;
  description: string;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
}

export class MainProcessTimer extends EventEmitter {
  private timeLogService: TimeLogService;
  private projectService: ProjectService;
  private timerInterval: NodeJS.Timeout | null = null;
  private state: TimerState = {
    isRunning: false,
    currentSession: null,
    elapsedTime: 0,
    description: '',
    projectId: null,
    projectName: null,
    projectColor: null,
  };

  constructor(timeLogService: TimeLogService, projectService: ProjectService) {
    super();
    this.timeLogService = timeLogService;
    this.projectService = projectService;
    this.restoreActiveSession();
  }

  async startTimer(description?: string, projectId?: number): Promise<TimeLog> {
    try {
      // Stop current timer if running
      if (this.state.isRunning && this.state.currentSession) {
        await this.stopTimer();
      }

      const finalDescription = description || this.state.description || '';
      const finalProjectId = projectId !== undefined ? projectId : this.state.projectId;

      const session = await this.timeLogService.startTimer(finalDescription, finalProjectId);
      
      // Get project information if projectId is provided
      let projectName = null;
      let projectColor = null;
      if (finalProjectId) {
        const project = await this.projectService.getProjectById(finalProjectId);
        if (project) {
          projectName = project.name;
          projectColor = project.color;
        }
      }
      
      this.state = {
        ...this.state,
        isRunning: true,
        currentSession: session,
        elapsedTime: 0,
        description: finalDescription,
        projectId: finalProjectId,
        projectName,
        projectColor,
      };

      this.startTimerInterval();
      this.emitStateChange();
      
      return session;
    } catch (error) {
      console.error('Failed to start timer in main process:', error);
      throw error;
    }
  }

  async stopTimer(description?: string): Promise<TimeLog> {
    try {
      if (!this.state.currentSession) {
        throw new Error('No active timer to stop');
      }

      const finalDescription = description !== undefined ? description : this.state.description;
      const session = this.timeLogService.stopTimer(finalDescription);
      
      if (!session) {
        throw new Error('Failed to stop timer - session not found');
      }
      
      this.stopTimerInterval();
      
      this.state = {
        ...this.state,
        isRunning: false,
        currentSession: null,
        elapsedTime: 0,
        description: '',
        projectId: null,
        projectName: null,
        projectColor: null,
      };

      this.emitStateChange();
      
      return session;
    } catch (error) {
      console.error('Failed to stop timer in main process:', error);
      throw error;
    }
  }

  async toggleTimer(): Promise<TimeLog> {
    if (this.state.isRunning) {
      return this.stopTimer();
    } else {
      return this.startTimer();
    }
  }

  setDescription(description: string): void {
    this.state.description = description;
    this.emitStateChange();
  }

  setProjectId(projectId: number | null): void {
    this.state.projectId = projectId;
    this.emitStateChange();
  }

  getState(): TimerState {
    return { ...this.state };
  }

  private startTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      if (this.state.currentSession) {
        const startTime = new Date(this.state.currentSession.start_time);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        this.state.elapsedTime = elapsedSeconds;
        this.emitStateChange();
      }
    }, 1000);
  }

  private stopTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private restoreActiveSession(): void {
    try {
      const activeSession = this.timeLogService.getActiveTimeLog();
      if (activeSession) {
        const startTime = new Date(activeSession.start_time);
        const now = new Date();
        const elapsedTime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        // Get project information if available
        let projectName = null;
        let projectColor = null;
        if (activeSession.project_id) {
          const project = this.projectService.getProjectById(activeSession.project_id);
          if (project) {
            projectName = project.name;
            projectColor = project.color;
          }
        }
        
        this.state = {
          isRunning: true,
          currentSession: activeSession,
          elapsedTime,
          description: activeSession.description,
          projectId: activeSession.project_id,
          projectName,
          projectColor,
        };

        this.startTimerInterval();
        this.emitStateChange();
      }
    } catch (error) {
      console.error('Failed to restore active session in main process:', error);
    }
  }

  private emitStateChange(): void {
    this.emit('state-changed', this.getState());
  }

  async setDefaultProject(projectId: number | null): Promise<void> {
    let projectName = null;
    let projectColor = null;
    if (projectId) {
      const project = await this.projectService.getProjectById(projectId);
      if (project) {
        projectName = project.name;
        projectColor = project.color;
      }
    }

    this.state = {
      ...this.state,
      projectId,
      projectName,
      projectColor,
    };

    this.emitStateChange();
  }

  destroy(): void {
    this.stopTimerInterval();
    this.removeAllListeners();
  }
}