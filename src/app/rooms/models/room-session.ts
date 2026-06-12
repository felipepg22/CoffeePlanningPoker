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
  participants: readonly RoomParticipant[];
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

export interface RoomCommandResult {
  success: boolean;
  snapshot: RoomSnapshot | null;
  error: RoomError | null;
  participant?: RoomParticipant | null;
  event?: string | null;
}
