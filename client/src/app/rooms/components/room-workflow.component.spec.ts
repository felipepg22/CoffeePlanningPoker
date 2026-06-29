import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
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
import { RoomGateway } from '../services/room-gateway';
import { RoomWorkflowComponent } from './room-workflow.component';

describe('RoomWorkflowComponent', () => {
  let fixture: ComponentFixture<RoomWorkflowComponent>;
  let component: RoomWorkflowComponent;
  let gateway: FakeRoomGateway;
  let routeParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    localStorage.clear();
    gateway = new FakeRoomGateway();
    routeParams = new BehaviorSubject(convertToParamMap({}));
    router = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [RoomWorkflowComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: routeParams.asObservable() } },
        { provide: Router, useValue: router },
        { provide: RoomGateway, useValue: gateway },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomWorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows entry controls without active room controls by default', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Create room');
    expect(text).toContain('Join room');
    expect(text).not.toContain('Pick an estimate card');
    expect(text).not.toContain('Participants');
  });

  it('prefills join flow from invite route', () => {
    routeParams.next(convertToParamMap({ roomCode: 'brew-482' }));
    fixture.detectChanges();

    expect(component.roomMode()).toBe('join');
    expect(component.joinCode()).toBe('BREW-482');
  });

  it('creates a room and reveals the active workflow', async () => {
    gateway.nextResult = success(snapshot());
    component.roomName.set('Sprint planning');
    component.displayName.set('Felipe');

    await component.startRoom(new Event('submit'), 'create');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(component.activeRoom()?.roomCode).toBe('BREW-482');
    expect(text).toContain('Pick an estimate card');
    expect(text).toContain('Participants');
    expect(router.navigate).toHaveBeenCalledWith(['/en-US/rooms/brew-482'], { replaceUrl: true });
  });

  it('keeps invite code available after failed resume', async () => {
    localStorage.setItem('coffee-planning-poker.room.BREW-482', JSON.stringify({
      roomCode: 'BREW-482',
      participantId: 'p-1',
      displayName: 'Felipe',
      resumeToken: 'token-1',
      lastJoinedAt: Date.now(),
    }));
    gateway.nextResult = {
      success: false,
      snapshot: null,
      error: { code: 'resume_rejected', message: 'Resume failed', roomCode: 'BREW-482' },
    };

    routeParams.next(convertToParamMap({ roomCode: 'brew-482' }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.roomMode()).toBe('join');
    expect(component.joinCode()).toBe('BREW-482');
    expect(component.setupMessage()).toContain('could not resume');
  });

  it('adds a task and selects it for the facilitator', async () => {
    gateway.nextResult = success(snapshot());
    component.roomName.set('Sprint planning');
    component.displayName.set('Felipe');
    await component.startRoom(new Event('submit'), 'create');
    gateway.nextAddTaskResult = success(snapshot({ snapshotVersion: 2, extraTask: true }));
    gateway.nextSelectTaskResult = success(snapshot({ snapshotVersion: 3, activeTaskId: 'task-2', roundId: 'round-2', extraTask: true }));
    component.newTaskTitle.set('New task');

    await component.addTask(new Event('submit'));
    fixture.detectChanges();

    expect(gateway.lastAddTask?.title).toBe('New task');
    expect(gateway.lastSelectTask?.taskId).toBe('task-2');
    expect(fixture.nativeElement.textContent).toContain('New task');
  });

  it('casts and changes votes through session commands', async () => {
    gateway.nextResult = success(snapshot());
    component.roomName.set('Sprint planning');
    component.displayName.set('Felipe');
    await component.startRoom(new Event('submit'), 'create');
    gateway.nextCastVoteResult = success(snapshot({ snapshotVersion: 2, localEstimate: '5', hasLocalVote: true }));

    await component.castVote('5');
    fixture.detectChanges();

    expect(gateway.lastCastVote).toEqual(expect.objectContaining({ roundId: 'round-1', estimate: '5' }));
    expect(fixture.nativeElement.textContent).toContain('Selected 5');
  });

  it('hides facilitator actions for participants while keeping voting visible', async () => {
    gateway.nextResult = success(snapshot({ localRole: 'participant' }));
    component.roomName.set('Sprint planning');
    component.displayName.set('Sam');

    await component.startRoom(new Event('submit'), 'create');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pick an estimate card');
    expect(text).not.toContain('Reveal votes');
    expect(text).not.toContain('Save final estimate');
  });

  it('shows all-discussion reveal state without enabling save', async () => {
    gateway.nextResult = success(snapshot({ roundStatus: 'revealed', computedAverage: null, hasLocalVote: true, localEstimate: '?' }));
    component.roomName.set('Sprint planning');
    component.displayName.set('Felipe');

    await component.startRoom(new Event('submit'), 'create');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No numeric estimate yet');
    expect(component.canSaveEstimate()).toBe(false);
  });

  it('shows completed totals and reconnecting state', async () => {
    gateway.nextResult = success(snapshot({ completed: true, completedTotal: 7.5 }));
    component.roomName.set('Sprint planning');
    component.displayName.set('Felipe');

    await component.startRoom(new Event('submit'), 'create');
    gateway.connectionState.next('reconnecting');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Project estimate');
    expect(text).toContain('7.5');
    expect(text).toContain('Reconnecting');
  });
});

class FakeRoomGateway extends RoomGateway {
  readonly events = new Subject<RoomGatewayEvent>();
  readonly connectionState = new BehaviorSubject<RoomConnectionState>('idle');
  override readonly events$ = this.events.asObservable();
  override readonly connectionState$ = this.connectionState.asObservable();
  nextResult: RoomCommandResult = success(snapshot());
  nextAddTaskResult: RoomCommandResult | null = null;
  nextSelectTaskResult: RoomCommandResult | null = null;
  nextCastVoteResult: RoomCommandResult | null = null;
  lastAddTask: AddTaskCommand | null = null;
  lastSelectTask: SelectTaskCommand | null = null;
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

  override addTask(command: AddTaskCommand): Promise<RoomCommandResult> {
    this.lastAddTask = command;
    return Promise.resolve(this.nextAddTaskResult ?? this.nextResult);
  }

  override selectTask(command: SelectTaskCommand): Promise<RoomCommandResult> {
    this.lastSelectTask = command;
    return Promise.resolve(this.nextSelectTaskResult ?? this.nextResult);
  }

  override castVote(command: CastVoteCommand): Promise<RoomCommandResult> {
    this.lastCastVote = command;
    return Promise.resolve(this.nextCastVoteResult ?? this.nextResult);
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
  extraTask?: boolean;
  activeTaskId?: string;
  roundId?: string;
  localRole?: 'facilitator' | 'participant';
  roundStatus?: 'voting' | 'revealed' | 'closed';
  computedAverage?: number | null;
  localEstimate?: '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?';
  hasLocalVote?: boolean;
  completed?: boolean;
  completedTotal?: number;
} = {}): RoomSnapshot {
  const now = new Date().toISOString();
  const activeTaskId = options.activeTaskId ?? 'task-1';
  const tasks = [
    {
      taskId: 'task-1',
      title: 'Reconnect flow',
      details: 'Keep the room state.',
      status: activeTaskId === 'task-1' ? 'estimating' as const : 'unestimated' as const,
      finalEstimate: null,
    },
  ];

  if (options.extraTask) {
    tasks.push({
      taskId: 'task-2',
      title: 'New task',
      details: '',
      status: activeTaskId === 'task-2' ? 'estimating' : 'unestimated',
      finalEstimate: null,
    });
  }

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
        role: options.localRole ?? 'facilitator',
        presence: 'connected',
        lastSeenAt: now,
      },
    ],
    planningSession: {
      estimateCards: ['0', '1', '2', '3', '5', '8', '13', '21', '?'],
      tasks,
      currentTaskId: activeTaskId,
      activeRound: {
        roundId: options.roundId ?? 'round-1',
        taskId: activeTaskId,
        status: options.roundStatus ?? 'voting',
        createdAt: now,
        revealedAt: options.roundStatus === 'revealed' ? now : null,
        closedAt: options.roundStatus === 'closed' ? now : null,
        votes: [
          {
            participantId: 'p-1',
            hasVoted: options.hasLocalVote ?? false,
            estimate: options.localEstimate ?? null,
            votedAt: options.hasLocalVote ? now : null,
          },
        ],
        computedAverage: options.computedAverage ?? null,
      },
      completedRounds: [],
      archivedEstimateTotal: 0,
      estimationStatus: options.completed ? 'completed' : 'active',
      completedTotalEstimate: options.completed ? options.completedTotal ?? 7 : null,
    },
  };
}
