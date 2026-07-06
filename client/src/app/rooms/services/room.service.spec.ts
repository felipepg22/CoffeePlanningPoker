import { TestBed } from '@angular/core/testing';
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
  RoomGatewayEvent,
  RoomSnapshot,
  SaveFinalEstimateCommand,
  SelectTaskCommand,
  StartNextRoundCommand,
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
    expect(localStorage.getItem('coffee-planning-poker.room.BREW-482')).toContain('token-1');
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
    expect(service.activeRoom()?.participants.map((participant) => participant.displayName)).toEqual(['Felipe', 'Sam']);
  });

  it('ignores stale snapshots by version', async () => {
    gateway.nextResult = success(snapshot({ snapshotVersion: 4 }));
    await service.createRoom('Sprint planning', 'Felipe');

    gateway.events.next({ type: 'snapshot', snapshot: snapshot({ snapshotVersion: 3, roomName: 'Old room' }) });

    expect(service.activeRoom()?.snapshotVersion).toBe(4);
    expect(service.activeRoom()?.roomName).toBe('Sprint planning');
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

    expect(localStorage.getItem('coffee-planning-poker.room.BREW-482')).toBeNull();
    expect(service.error()?.code).toBe('resume_rejected');
  });

  it('copies invite links from the current frontend origin', async () => {
    const originalClipboard = navigator.clipboard;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    try {
      gateway.nextResult = success(snapshot({ inviteUrl: 'https://api.example.com/rooms/brew-482' }));
      await service.createRoom('Sprint planning', 'Felipe');

      await service.copyInviteLink();

      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/rooms/brew-482`);
      expect(service.inviteCopied()).toBe(true);
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    }
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

  override addTask(_command: AddTaskCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override selectTask(_command: SelectTaskCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override castVote(_command: CastVoteCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override revealVotes(_command: RevealVotesCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override resetRound(_command: ResetRoundCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override startNextRound(_command: StartNextRoundCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override saveFinalEstimate(_command: SaveFinalEstimateCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }

  override completeEstimation(_command: CompleteEstimationCommand): Promise<RoomCommandResult> {
    return Promise.resolve(this.nextResult);
  }
}

function success(snapshotValue: RoomSnapshot): RoomCommandResult {
  return { success: true, snapshot: snapshotValue, error: null };
}

function snapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  const now = new Date().toISOString();
  return {
    roomCode: 'BREW-482',
    roomName: 'Sprint planning',
    inviteUrl: 'http://localhost:4200/rooms/brew-482',
    localParticipantId: 'p-1',
    resumeToken: 'token-1',
    createdAt: now,
    updatedAt: now,
    snapshotVersion: 1,
    participants: [
      {
        participantId: 'p-1',
        displayName: 'Felipe',
        role: 'facilitator',
        presence: 'connected',
        lastSeenAt: now,
      },
    ],
    planningSession: {
      estimateCards: ['0', '1', '2', '3', '5', '8', '13', '21', '?'],
      tasks: [],
      currentTaskId: null,
      activeRound: null,
      completedRounds: [],
      archivedEstimateTotal: 0,
      estimationStatus: 'active',
      completedTotalEstimate: null,
    },
    ...overrides,
  };
}
