import { Observable } from 'rxjs';

import {
  AddTaskCommand,
  CastVoteCommand,
  CompleteEstimationCommand,
  CreateRoomCommand,
  HeartbeatCommand,
  JoinRoomCommand,
  LeaveRoomCommand,
  ResumeRoomCommand,
  ResetRoundCommand,
  RevealVotesCommand,
  RoomCommandResult,
  RoomConnectionState,
  RoomGatewayEvent,
  SaveFinalEstimateCommand,
  SelectTaskCommand,
  StartNextRoundCommand,
} from '../models/room-session';

export abstract class RoomGateway {
  abstract readonly events$: Observable<RoomGatewayEvent>;
  abstract readonly connectionState$: Observable<RoomConnectionState>;
  abstract createRoom(command: CreateRoomCommand): Promise<RoomCommandResult>;
  abstract joinRoom(command: JoinRoomCommand): Promise<RoomCommandResult>;
  abstract resumeRoom(command: ResumeRoomCommand): Promise<RoomCommandResult>;
  abstract leaveRoom(command: LeaveRoomCommand): Promise<RoomCommandResult>;
  abstract heartbeat(command: HeartbeatCommand): Promise<RoomCommandResult>;
  abstract addTask(command: AddTaskCommand): Promise<RoomCommandResult>;
  abstract selectTask(command: SelectTaskCommand): Promise<RoomCommandResult>;
  abstract castVote(command: CastVoteCommand): Promise<RoomCommandResult>;
  abstract revealVotes(command: RevealVotesCommand): Promise<RoomCommandResult>;
  abstract resetRound(command: ResetRoundCommand): Promise<RoomCommandResult>;
  abstract startNextRound(command: StartNextRoundCommand): Promise<RoomCommandResult>;
  abstract saveFinalEstimate(command: SaveFinalEstimateCommand): Promise<RoomCommandResult>;
  abstract completeEstimation(command: CompleteEstimationCommand): Promise<RoomCommandResult>;
}
