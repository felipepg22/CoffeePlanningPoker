import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Subject } from 'rxjs';

import {
  CreateRoomCommand,
  HeartbeatCommand,
  JoinRoomCommand,
  LeaveRoomCommand,
  ResumeRoomCommand,
  RoomCommandResult,
  RoomConnectionState,
  RoomGatewayEvent,
  RoomSnapshot,
} from '../models/room-session';
import { RoomGateway } from './room-gateway';
import { RoomService } from './room.service';

describe('RoomService', () => {
  let gateway: FakeRoomGateway;
  let service: RoomService;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeRoomGateway();
    TestBed.configureTestingModule({
      providers: [
        RoomService,
        { provide: RoomGateway, useValue: gateway },
      ],
    });
    service = TestBed.inject(RoomService);
  });

  it('creates a room and persists recovery anchors', async () => {
    gateway.nextResult = success(snapshot());

    await expect(service.createRoom('Sprint planning', 'Felipe')).resolves.toBe(true);

    expect(service.activeRoom()?.roomCode).toBe('BREW-482');
    expect(service.participants().length).toBe(1);
    expect(localStorage.getItem('coffe-planning-poker.room.BREW-482')).toContain('token-1');
  });

  it('joins a room and updates participants from gateway events', async () => {
    gateway.nextResult = success(snapshot());
    await service.joinRoom('BREW-482', 'Felipe');

    gateway.events.next({
      type: 'participantJoined',
      event: {
        roomCode: 'BREW-482',
        participant: {
          participantId: 'p-2',
          displayName: 'Sam',
          role: 'participant',
          presence: 'connected',
          lastSeenAt: new Date().toISOString(),
        },
      },
    });

    expect(service.participants().map((participant) => participant.displayName)).toEqual(['Felipe', 'Sam']);
  });

  it('tracks local connection state separately from participants', () => {
    gateway.connectionState.next('reconnecting');

    expect(service.connectionState()).toBe('reconnecting');
    expect(service.participants()).toEqual([]);
  });

  it('clears stale anchor after failed resume', async () => {
    gateway.nextResult = success(snapshot());
    await service.createRoom('Sprint planning', 'Felipe');
    gateway.nextResult = {
      success: false,
      snapshot: null,
      error: { code: 'resume_rejected', message: 'Nope', roomCode: 'BREW-482' },
    };

    await expect(service.resumeRoom('BREW-482')).resolves.toBe(false);

    expect(localStorage.getItem('coffe-planning-poker.room.BREW-482')).toBeNull();
    expect(service.error()?.code).toBe('resume_rejected');
  });
});

class FakeRoomGateway extends RoomGateway {
  readonly events = new Subject<RoomGatewayEvent>();
  readonly connectionState = new BehaviorSubject<RoomConnectionState>('idle');
  override readonly events$ = this.events.asObservable();
  override readonly connectionState$ = this.connectionState.asObservable();
  nextResult: RoomCommandResult = success(snapshot());

  override createRoom(_command: CreateRoomCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override joinRoom(_command: JoinRoomCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override resumeRoom(_command: ResumeRoomCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override leaveRoom(_command: LeaveRoomCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override heartbeat(_command: HeartbeatCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }
}

function success(snapshotValue: RoomSnapshot): RoomCommandResult {
  return { success: true, snapshot: snapshotValue, error: null };
}

function snapshot(): RoomSnapshot {
  return {
    roomCode: 'BREW-482',
    roomName: 'Sprint planning',
    inviteUrl: 'http://localhost:4200/rooms/brew-482',
    localParticipantId: 'p-1',
    resumeToken: 'token-1',
    createdAt: new Date().toISOString(),
    participants: [
      {
        participantId: 'p-1',
        displayName: 'Felipe',
        role: 'facilitator',
        presence: 'connected',
        lastSeenAt: new Date().toISOString(),
      },
    ],
  };
}
