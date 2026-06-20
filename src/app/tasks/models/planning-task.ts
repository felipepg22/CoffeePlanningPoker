export type PlanningTaskStatus = 'unestimated' | 'estimating' | 'estimated';
export type RoomEstimationStatus = 'active' | 'completed';

export interface FinalEstimate {
  value: number;
  roundId: string;
  savedAt: string;
  archived: boolean;
}

export interface PlanningTask {
  taskId: string;
  title: string;
  details: string;
  status: PlanningTaskStatus;
  finalEstimate: FinalEstimate | null;
}

export type TaskPendingAction =
  | 'addTask'
  | 'selectTask'
  | 'saveFinalEstimate'
  | 'completeEstimation'
  | null;
