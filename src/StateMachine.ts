import { getCurrentTime } from './main';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { NotificationManager } from './types/NotificationManager';

export enum WorkState {
  NOT_WORKING = 'NOT_WORKING',
  WORKING = 'WORKING',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
}

export interface WorkAction {
  label: string;
  buttonText: string;
  buttonId: string;
  nextState: WorkState;
}

export interface TransitionOptions {
  dryRun?: boolean;
}

export const STATE_EMOJIS: Record<WorkState, string> = {
  [WorkState.NOT_WORKING]: '🏠', // House for not working
  [WorkState.WORKING]: '⚡', // Lightning bolt for working
  [WorkState.PAUSED]: '☕', // Coffee for break
  [WorkState.FINISHED]: '🏠', // House for finished
};

export const STATE_ACTIONS: Record<WorkState, WorkAction[]> = {
  [WorkState.NOT_WORKING]: [
    {
      label: 'Start Work',
      buttonText: 'Mobiles Arbeiten beg',
      buttonId: 'TerminalButton4',
      nextState: WorkState.WORKING,
    },
  ],
  [WorkState.WORKING]: [
    {
      label: 'Start Break',
      buttonText: 'Pause Mobiles Arbeit',
      buttonId: 'TerminalButton6',
      nextState: WorkState.PAUSED,
    },
    {
      label: 'Finish Work',
      buttonText: 'Mobiles Arbeiten end',
      buttonId: 'TerminalButton5',
      nextState: WorkState.FINISHED,
    },
  ],
  [WorkState.PAUSED]: [
    {
      label: 'Return from Break',
      buttonText: 'Mobiles Arbeiten beg',
      buttonId: 'TerminalButton4',
      nextState: WorkState.WORKING,
    },
    {
      label: 'Finish Work',
      buttonText: 'Mobiles Arbeiten end',
      buttonId: 'TerminalButton5',
      nextState: WorkState.FINISHED,
    },
  ],
  [WorkState.FINISHED]: [],
};

export interface StateNotification {
  id: string;
  title: string;
  body: string;
  delayMs?: number;
  forceShow?: boolean;
}

interface PersistentState {
  currentState: WorkState;
  startTime: number | null;
  totalWorkedTime: number;
}

interface ButtonMapping {
  state: string;
  action: string;
  buttonId: string;
}

export class StateMachine {
  private state: WorkState = WorkState.NOT_WORKING;
  private startTime: Date | null = null;
  private totalWorkedTime = 0;
  private onStateChange?: (
    newState: WorkState,
    notification?: StateNotification
  ) => void;
  private finishedForToday = false;
  private notificationManager?: NotificationManager;
  private buttonMappings: ButtonMapping[] = [];

  constructor(notificationManager?: NotificationManager) {
    this.notificationManager = notificationManager;
    this.loadButtonMappings();

    try {
      this.restoreState();
    } catch (error) {
      console.error('Failed to restore state:', error);
      this.initializeDefaultState();
    }
  }

  private initializeDefaultState() {
    // Set default state values here
    // For example:
    this.state = WorkState.NOT_WORKING;
    this.startTime = null;
    this.totalWorkedTime = 0;
    this.finishedForToday = false;
  }

  private loadButtonMappings(): void {
    try {
      const mappingsPath = path.join(
        app.getPath('userData'),
        'button-mappings.json'
      );
      if (fs.existsSync(mappingsPath)) {
        const data = fs.readFileSync(mappingsPath, 'utf8');
        this.buttonMappings = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load button mappings:', error);
      // Fall back to default mappings
      this.buttonMappings = [];
    }
  }

  public getButtonIdForAction(
    state: WorkState,
    actionLabel: string
  ): string | undefined {
    const mapping = this.buttonMappings.find(
      (m) => m.state === state && m.action === actionLabel
    );
    return mapping?.buttonId;
  }

  public getState(): WorkState {
    return this.state;
  }

  public getStartTime(): Date | null {
    return this.startTime;
  }

  public getTotalWorkedTime(): number {
    return this.totalWorkedTime;
  }

  public getAvailableActions(): WorkAction[] {
    const defaultActions = STATE_ACTIONS[this.state];
    return defaultActions.map((action) => ({
      ...action,
      buttonId:
        this.getButtonIdForAction(this.state, action.label) || action.buttonId,
    }));
  }

  private getStateNotification(
    state: WorkState,
    elapsedTime?: number
  ): StateNotification | undefined {
    switch (state) {
      case WorkState.WORKING:
        return {
          id: 'work-started',
          title: 'Work Started',
          body: `Started working at ${getCurrentTime().toLocaleTimeString()}`,
          forceShow: true,
        };
      case WorkState.PAUSED:
        return elapsedTime
          ? {
              id: 'work-paused',
              title: 'Work Paused',
              body: `Worked for ${this.formatDuration(elapsedTime)} before break`,
              forceShow: true,
            }
          : undefined;
      case WorkState.FINISHED:
        return {
          id: 'work-finished',
          title: 'Work Finished',
          body: `Total work time: ${this.formatDuration(this.totalWorkedTime)}`,
          forceShow: true,
        };
      default:
        return undefined;
    }
  }

  private getStatePath(): string {
    return path.join(app.getPath('userData'), 'work-state.json');
  }

  public persistState(): void {
    const state: PersistentState = {
      currentState: this.state,
      startTime: this.startTime?.getTime() || null,
      totalWorkedTime: this.totalWorkedTime,
    };

    try {
      fs.writeFileSync(this.getStatePath(), JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  private restoreState(): void {
    try {
      const statePath = this.getStatePath();
      if (fs.existsSync(statePath)) {
        const stateData = fs.readFileSync(statePath, 'utf8');
        const state: PersistentState = JSON.parse(stateData);

        this.state = state.currentState;
        this.startTime = state.startTime ? new Date(state.startTime) : null;
        this.totalWorkedTime = state.totalWorkedTime;

        // Notify listeners of restored state
        if (this.onStateChange) {
          this.onStateChange(this.state);
        }
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
  }

  public async transition(
    action: WorkAction,
    getCurrentTime: () => Date,
    options: TransitionOptions = {}
  ): Promise<void> {
    // Check if the action is valid for current state
    const validActions = this.getAvailableActions();
    const isValidAction = validActions.some(
      (validAction) =>
        validAction.label === action.label &&
        validAction.nextState === action.nextState
    );

    if (!isValidAction) {
      throw new Error(`Invalid action ${action.label} for state ${this.state}`);
    }

    let elapsedTime: number | undefined;
    if (
      this.startTime &&
      (action.nextState === WorkState.PAUSED ||
        action.nextState === WorkState.FINISHED)
    ) {
      elapsedTime = getCurrentTime().getTime() - this.startTime.getTime();
      if (!options.dryRun) {
        this.totalWorkedTime += elapsedTime;
      }
      this.startTime = null;
    }

    if (action.nextState === WorkState.WORKING) {
      this.startTime = getCurrentTime();
      this.finishedForToday = false;
    } else if (action.nextState === WorkState.FINISHED) {
      this.finishedForToday = true;
      if (!options.dryRun) {
        this.totalWorkedTime = 0;
      }
    }

    this.state =
      action.nextState === WorkState.FINISHED
        ? WorkState.NOT_WORKING
        : action.nextState;

    if (this.onStateChange) {
      const notification = this.getStateNotification(
        action.nextState,
        elapsedTime
      );
      // Still notify of state change but mark it as dry run
      this.onStateChange(this.state, options.dryRun ? undefined : notification);
    }

    // Only persist state if not in dry run mode
    if (!options.dryRun) {
      this.persistState();
    }
  }

  public isFinishedForToday(): boolean {
    return this.finishedForToday;
  }

  public resetDailyTime(): void {
    this.totalWorkedTime = 0;
    this.finishedForToday = false;
    // Add persistence
    this.persistState();
  }

  // Also add persistence when manually setting finished status
  public setFinishedForToday(finished: boolean): void {
    this.finishedForToday = finished;
    this.persistState();
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  public manuallySetState(
    state: WorkState,
    startTime: Date,
    totalWorkedTime: number
  ) {
    this.state = state;
    this.startTime = startTime;
    this.totalWorkedTime = totalWorkedTime;

    // Notify listeners of restored state
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  private notifyStateChange() {
    if (this.notificationManager?.onWorkStateChange) {
      this.notificationManager.onWorkStateChange(this.state);
    }
  }

  public reloadButtonMappings(): void {
    this.loadButtonMappings();
  }
}
