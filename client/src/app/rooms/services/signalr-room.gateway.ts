import { Injectable, InjectionToken, inject } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';

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
  RoomError,
  RoomGatewayEvent,
  RoomParticipantEvent,
  RoomSnapshot,
  SaveFinalEstimateCommand,
  SelectTaskCommand,
  StartNextRoundCommand,
} from '../models/room-session';
import { RoomGateway } from './room-gateway';

interface RuntimeConfig {
  roomHubUrl?: string;
}

declare global {
  interface Window {
    coffeePlanningPokerConfig?: RuntimeConfig;
  }
}

const DEFAULT_ROOM_HUB_URL = 'http://localhost:5050/hubs/rooms';

export const ROOM_HUB_URL = new InjectionToken<string>('ROOM_HUB_URL', {
  factory: () => window.coffeePlanningPokerConfig?.roomHubUrl?.trim() || DEFAULT_ROOM_HUB_URL,
});

@Injectable({ providedIn: 'root' })
export class SignalRRoomGateway extends RoomGateway {
  private readonly hubUrl = inject(ROOM_HUB_URL);
  private readonly eventsSubject = new Subject<RoomGatewayEvent>();
  private readonly connectionStateSubject = new BehaviorSubject<RoomConnectionState>('idle');
  private connection: HubConnection | null = null;

  override readonly events$ = this.eventsSubject.asObservable();
  override readonly connectionState$ = this.connectionStateSubject.asObservable();

  override async createRoom(command: CreateRoomCommand): Promise<RoomCommandResult> {
    return this.invoke('CreateRoom', command);
  }

  override async joinRoom(command: JoinRoomCommand): Promise<RoomCommandResult> {
    return this.invoke('JoinRoom', command);
  }

  override async resumeRoom(command: ResumeRoomCommand): Promise<RoomCommandResult> {
    return this.invoke('ResumeRoom', command);
  }

  override async leaveRoom(command: LeaveRoomCommand): Promise<RoomCommandResult> {
    return this.invoke('LeaveRoom', command);
  }

  override async heartbeat(command: HeartbeatCommand): Promise<RoomCommandResult> {
    return this.invoke('Heartbeat', command);
  }

  override async addTask(command: AddTaskCommand): Promise<RoomCommandResult> {
    return this.invoke('AddTask', command);
  }

  override async selectTask(command: SelectTaskCommand): Promise<RoomCommandResult> {
    return this.invoke('SelectTask', command);
  }

  override async castVote(command: CastVoteCommand): Promise<RoomCommandResult> {
    return this.invoke('CastVote', command);
  }

  override async revealVotes(command: RevealVotesCommand): Promise<RoomCommandResult> {
    return this.invoke('RevealVotes', command);
  }

  override async resetRound(command: ResetRoundCommand): Promise<RoomCommandResult> {
    return this.invoke('ResetRound', command);
  }

  override async startNextRound(command: StartNextRoundCommand): Promise<RoomCommandResult> {
    return this.invoke('StartNextRound', command);
  }

  override async saveFinalEstimate(command: SaveFinalEstimateCommand): Promise<RoomCommandResult> {
    return this.invoke('SaveFinalEstimate', command);
  }

  override async completeEstimation(command: CompleteEstimationCommand): Promise<RoomCommandResult> {
    return this.invoke('CompleteEstimation', command);
  }

  private async invoke(methodName: string, command: unknown): Promise<RoomCommandResult> {
    try {
      const connection = await this.ensureConnection();
      const result = await connection.invoke<RoomCommandResult>(methodName, command);
      this.emitSnapshot(result);
      return result;
    } catch {
      this.connectionStateSubject.next('disconnected');
      const error: RoomError = {
        code: 'connection_failed',
        message: 'Room service is unavailable. Try again.',
      };
      this.eventsSubject.next({ type: 'error', error });
      return { success: false, snapshot: null, error };
    }
  }

  private async ensureConnection(): Promise<HubConnection> {
    if (!this.connection) {
      this.connection = this.createConnection();
    }

    if (this.connection.state === HubConnectionState.Connected) {
      return this.connection;
    }

    this.connectionStateSubject.next('connecting');
    await this.connection.start();
    this.connectionStateSubject.next('connected');
    return this.connection;
  }

  private createConnection(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onreconnecting(() => this.connectionStateSubject.next('reconnecting'));
    connection.onreconnected(() => this.connectionStateSubject.next('connected'));
    connection.onclose(() => this.connectionStateSubject.next('disconnected'));

    connection.on('RoomSnapshot', (snapshot: RoomSnapshot) => {
      this.eventsSubject.next({ type: 'snapshot', snapshot });
    });
    connection.on('ParticipantJoined', (event: RoomParticipantEvent) => {
      this.eventsSubject.next({ type: 'participantJoined', event });
    });
    connection.on('ParticipantLeft', (event: RoomParticipantEvent) => {
      this.eventsSubject.next({ type: 'participantLeft', event });
    });
    connection.on('PresenceChanged', (event: RoomParticipantEvent) => {
      this.eventsSubject.next({ type: 'presenceChanged', event });
    });
    connection.on('RoomError', (error: RoomError) => {
      this.eventsSubject.next({ type: 'error', error });
    });

    return connection;
  }

  private emitSnapshot(result: RoomCommandResult): void {
    if (result.snapshot) {
      this.eventsSubject.next({ type: 'snapshot', snapshot: result.snapshot });
    }

    if (result.error) {
      this.eventsSubject.next({ type: 'error', error: result.error });
    }
  }
}
