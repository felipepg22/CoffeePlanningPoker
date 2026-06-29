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
  ResetRoundCommand,
  ResumeRoomCommand,
  RevealVotesCommand,
  RoomCommandResult,
  RoomConnectionState,
  RoomGatewayEvent,
  RoomSnapshot,
  SaveFinalEstimateCommand,
  SelectTaskCommand,
  StartNextRoundCommand,
} from '../../rooms/models/room-session';
import { RoomGateway } from '../../rooms/services/room-gateway';
import { RoomService } from '../../rooms/services/room.service';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let gateway: FakeRoomGateway;
  let room: RoomService;
  let service: SessionService;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeRoomGateway();
    TestBed.configureTestingModule({
      providers: [
        RoomService,
        SessionService,
        { provide: RoomGateway, useValue: gateway },
      ],
    });
    room = TestBed.inject(RoomService);
    service = TestBed.inject(SessionService);
  });

  it('derives hidden vote progress and local vote visibility', async () => {
    gateway.nextResult = success(snapshot());

    await room.createRoom('Sprint planning', 'Felipe');

    expect(service.votedCount()).toBe(2);
    expect(service.totalVoters()).toBe(2);
    expect(service.voteProgress()).toBe(100);
    expect(service.localVote()).toBe('3');
    expect(service.participantRows().find((participant) => participant.participantId === 'p-2')?.estimate).toBeNull();
    expect(service.canReveal()).toBe(true);
  });

  it('applies command snapshots and exposes failures without clearing current state', async () => {
    gateway.nextResult = success(snapshot());
    await room.createRoom('Sprint planning', 'Felipe');
    gateway.nextResult = success(snapshot({ snapshotVersion: 2, activeEstimate: '5' }));

    await expect(service.castVote('5')).resolves.toBe(true);
    expect(gateway.lastCastVote?.estimate).toBe('5');
    expect(service.localVote()).toBe('5');

    gateway.nextResult = {
      success: false,
      snapshot: null,
      error: { code: 'stale_round', message: 'Round changed.', roomCode: 'BREW-482' },
    };

    await expect(service.castVote('8')).resolves.toBe(false);
    expect(service.error()?.code).toBe('stale_round');
    expect(room.activeRoom()?.snapshotVersion).toBe(2);
  });

  it('derives revealed computed averages', async () => {
    gateway.nextResult = success(snapshot({
      roundStatus: 'revealed',
      computedAverage: 4,
      revealOtherEstimate: true,
    }));

    await room.createRoom('Sprint planning', 'Felipe');

    expect(service.votesRevealed()).toBe(true);
    expect(service.computedAverage()).toBe(4);
    expect(service.participantRows().map((participant) => participant.estimate)).toEqual(['3', '5']);
  });
});

class FakeRoomGateway extends RoomGateway {
  readonly events = new Subject<RoomGatewayEvent>();
  readonly connectionState = new BehaviorSubject<RoomConnectionState>('idle');
  override readonly events$ = this.events.asObservable();
  override readonly connectionState$ = this.connectionState.asObservable();
  nextResult: RoomCommandResult = success(snapshot());
  lastCastVote: CastVoteCommand | null = null;

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

  override castVote(command: CastVoteCommand): Promise<RoomCommandResult> {
    this.lastCastVote = command;
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

function snapshot(options: {
  snapshotVersion?: number;
  activeEstimate?: '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?';
  roundStatus?: 'voting' | 'revealed' | 'closed';
  computedAverage?: number | null;
  revealOtherEstimate?: boolean;
} = {}): RoomSnapshot {
  const now = new Date().toISOString();
  return {
    roomCode: 'BREW-482',
    roomName: 'Sprint planning',
    inviteUrl: 'http://localhost:4200/rooms/brew-482',
    localParticipantId: 'p-1',
    resumeToken: 'token-1',
    createdAt: now,
    updatedAt: now,
    snapshotVersion: options.snapshotVersion ?? 1,
    participants: [
      {
        participantId: 'p-1',
        displayName: 'Felipe',
        role: 'facilitator',
        presence: 'connected',
        lastSeenAt: now,
      },
      {
        participantId: 'p-2',
        displayName: 'Sam',
        role: 'participant',
        presence: 'connected',
        lastSeenAt: now,
      },
    ],
    planningSession: {
      estimateCards: ['0', '1', '2', '3', '5', '8', '13', '21', '?'],
      tasks: [
        {
          taskId: 'task-1',
          title: 'Reconnect flow',
          details: '',
          status: 'estimating',
          finalEstimate: null,
        },
      ],
      currentTaskId: 'task-1',
      activeRound: {
        roundId: 'round-1',
        taskId: 'task-1',
        status: options.roundStatus ?? 'voting',
        createdAt: now,
        revealedAt: options.roundStatus === 'revealed' ? now : null,
        closedAt: null,
        computedAverage: options.computedAverage ?? null,
        votes: [
          {
            participantId: 'p-1',
            hasVoted: true,
            estimate: options.activeEstimate ?? '3',
            votedAt: now,
          },
          {
            participantId: 'p-2',
            hasVoted: true,
            estimate: options.revealOtherEstimate ? '5' : null,
            votedAt: null,
          },
        ],
      },
      completedRounds: [],
      archivedEstimateTotal: 0,
      estimationStatus: 'active',
      completedTotalEstimate: null,
    },
  };
}
