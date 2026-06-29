import { EstimateValue, PlanningRound } from '../../session/models/planning-round';
import { PlanningTask, RoomEstimationStatus } from '../../tasks/models/planning-task';

export type ParticipantPresence = 'connected' | 'reconnecting' | 'disconnected' | 'left';
export type ParticipantRole = 'facilitator' | 'participant';
export type RoomConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
export type RoomPendingAction = 'create' | 'join' | 'resume' | 'leave' | null;

export interface RoomParticipant {
  participantId: string;
  displayName: string;
  role: ParticipantRole;
  presence: ParticipantPresence;
  lastSeenAt: string;
}

export interface RoomSnapshot {
  roomCode: string;
  roomName: string;
  inviteUrl: string;
  localParticipantId: string;
  resumeToken: string;
  createdAt: string;
  updatedAt: string;
  snapshotVersion: number;
  participants: readonly RoomParticipant[];
  planningSession: RoomPlanningSession | null;
}

export interface RoomPlanningSession {
  estimateCards: readonly EstimateValue[];
  tasks: readonly PlanningTask[];
  currentTaskId: string | null;
  activeRound: PlanningRound | null;
  completedRounds: readonly PlanningRound[];
  archivedEstimateTotal: number;
  estimationStatus: RoomEstimationStatus;
  completedTotalEstimate: number | null;
}

export interface RoomError {
  code: RoomErrorCode;
  message: string;
  roomCode?: string;
}

export type RoomErrorCode =
  | 'invalid_room_name'
  | 'invalid_display_name'
  | 'invalid_room_code'
  | 'room_unavailable'
  | 'resume_rejected'
  | 'duplicate_join_rejected'
  | 'invalid_task_title'
  | 'forbidden'
  | 'task_not_found'
  | 'no_active_task'
  | 'stale_round'
  | 'invalid_estimate'
  | 'vote_closed'
  | 'round_not_revealed'
  | 'no_numeric_votes'
  | 'room_completed'
  | 'connection_failed';

export interface RecoveryAnchor {
  roomCode: string;
  participantId: string;
  displayName: string;
  resumeToken: string;
  lastJoinedAt: number;
}

export interface RoomParticipantEvent {
  roomCode: string;
  participant: RoomParticipant;
}

export type RoomGatewayEvent =
  | { type: 'snapshot'; snapshot: RoomSnapshot }
  | { type: 'participantJoined'; event: RoomParticipantEvent }
  | { type: 'participantLeft'; event: RoomParticipantEvent }
  | { type: 'presenceChanged'; event: RoomParticipantEvent }
  | { type: 'error'; error: RoomError };

export interface CreateRoomCommand {
  roomName: string;
  participantId: string;
  displayName: string;
}

export interface JoinRoomCommand {
  roomCode: string;
  participantId: string;
  displayName: string;
}

export interface ResumeRoomCommand {
  roomCode: string;
  participantId: string;
  resumeToken: string;
}

export interface LeaveRoomCommand {
  roomCode: string;
  participantId: string;
}

export interface HeartbeatCommand {
  roomCode: string;
  participantId: string;
}

export interface AddTaskCommand {
  roomCode: string;
  participantId: string;
  title: string;
  details: string | null;
}

export interface SelectTaskCommand {
  roomCode: string;
  participantId: string;
  taskId: string;
}

export interface CastVoteCommand {
  roomCode: string;
  participantId: string;
  roundId: string;
  estimate: EstimateValue;
}

export interface RevealVotesCommand {
  roomCode: string;
  participantId: string;
  roundId: string;
}

export interface ResetRoundCommand {
  roomCode: string;
  participantId: string;
  taskId: string;
}

export interface StartNextRoundCommand {
  roomCode: string;
  participantId: string;
  taskId: string | null;
}

export interface SaveFinalEstimateCommand {
  roomCode: string;
  participantId: string;
  taskId: string;
  roundId: string;
}

export interface CompleteEstimationCommand {
  roomCode: string;
  participantId: string;
}

export interface RoomCommandResult {
  success: boolean;
  snapshot: RoomSnapshot | null;
  error: RoomError | null;
  participant?: RoomParticipant | null;
  event?: string | null;
}
