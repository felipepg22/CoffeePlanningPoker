import { Injectable, InjectionToken, inject } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';

import {
  CreateRoomCommand,
  HeartbeatCommand,
  JoinRoomCommand,
  LeaveRoomCommand,
  ResumeRoomCommand,
  RoomCommandResult,
  RoomConnectionState,
  RoomError,
  RoomGatewayEvent,
  RoomParticipantEvent,
  RoomSnapshot,
} from '../models/room-session';
import { RoomGateway } from './room-gateway';

export const ROOM_HUB_URL = new InjectionToken<string>('ROOM_HUB_URL', {
  factory: () => 'http://localhost:5050/hubs/rooms',
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
