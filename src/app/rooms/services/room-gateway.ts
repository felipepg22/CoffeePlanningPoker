import { Observable } from 'rxjs';

import {
  CreateRoomCommand,
  HeartbeatCommand,
  JoinRoomCommand,
  LeaveRoomCommand,
  ResumeRoomCommand,
  RoomCommandResult,
  RoomConnectionState,
  RoomGatewayEvent,
} from '../models/room-session';

export abstract class RoomGateway {
  abstract readonly events$: Observable<RoomGatewayEvent>;
  abstract readonly connectionState$: Observable<RoomConnectionState>;
  abstract createRoom(command: CreateRoomCommand): Promise<RoomCommandResult>;
  abstract joinRoom(command: JoinRoomCommand): Promise<RoomCommandResult>;
  abstract resumeRoom(command: ResumeRoomCommand): Promise<RoomCommandResult>;
  abstract leaveRoom(command: LeaveRoomCommand): Promise<RoomCommandResult>;
  abstract heartbeat(command: HeartbeatCommand): Promise<RoomCommandResult>;
}
