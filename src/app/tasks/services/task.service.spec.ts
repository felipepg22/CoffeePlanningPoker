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
import { PlanningTask } from '../models/planning-task';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let gateway: FakeRoomGateway;
  let room: RoomService;
  let service: TaskService;

  beforeEach(() => {
    localStorage.clear();
    gateway = new FakeRoomGateway();
    TestBed.configureTestingModule({
      providers: [
        RoomService,
        TaskService,
        { provide: RoomGateway, useValue: gateway },
      ],
    });
    room = TestBed.inject(RoomService);
    service = TestBed.inject(TaskService);
  });

  it('derives tasks, saved estimates, archived totals, and completion totals from snapshots', async () => {
    gateway.nextResult = success(snapshot({ completed: true }));

    await room.createRoom('Sprint planning', 'Felipe');

    expect(service.tasks().length).toBe(2);
    expect(service.currentTask()?.taskId).toBe('task-2');
    expect(service.tasks()[0].finalEstimate?.archived).toBe(true);
    expect(service.archivedEstimateTotal()).toBe(2);
    expect(service.completedTotalEstimate()).toBe(7);
    expect(service.estimationStatus()).toBe('completed');
    expect(service.canComplete()).toBe(false);
  });

  it('applies task command snapshots and exposes command errors', async () => {
    gateway.nextResult = success(snapshot());
    await room.createRoom('Sprint planning', 'Felipe');
    gateway.nextResult = success(snapshot({ snapshotVersion: 2, addedTaskTitle: 'New task' }));

    await expect(service.addTask('New task', '')).resolves.toBe(true);
    expect(gateway.lastAddTask?.title).toBe('New task');
    expect(service.tasks().map((task) => task.title)).toContain('New task');

    gateway.nextResult = {
      success: false,
      snapshot: null,
      error: { code: 'forbidden', message: 'Only the facilitator can do that.', roomCode: 'BREW-482' },
    };

    await expect(service.selectTask('task-2')).resolves.toBe(false);
    expect(service.error()?.code).toBe('forbidden');
    expect(room.activeRoom()?.snapshotVersion).toBe(2);
  });

  it('saves final estimates without accepting arbitrary client values', async () => {
    gateway.nextResult = success(snapshot({ activeRound: true }));
    await room.createRoom('Sprint planning', 'Felipe');
    gateway.nextResult = success(snapshot({ snapshotVersion: 2, finalEstimate: 5 }));

    await expect(service.saveFinalEstimate()).resolves.toBe(true);

    expect(gateway.lastSaveFinalEstimate).toEqual({
      roomCode: 'BREW-482',
      participantId: 'p-1',
      taskId: 'task-2',
      roundId: 'round-2',
    });
    expect(Object.keys(gateway.lastSaveFinalEstimate ?? {}).sort()).toEqual(['participantId', 'roomCode', 'roundId', 'taskId']);
    expect(service.currentTask()?.finalEstimate?.value).toBe(5);
  });
});

class FakeRoomGateway extends RoomGateway {
  readonly events = new Subject<RoomGatewayEvent>();
  readonly connectionState = new BehaviorSubject<RoomConnectionState>('idle');
  override readonly events$ = this.events.asObservable();
  override readonly connectionState$ = this.connectionState.asObservable();
  nextResult: RoomCommandResult = success(snapshot());
  lastAddTask: AddTaskCommand | null = null;
  lastSaveFinalEstimate: SaveFinalEstimateCommand | null = null;

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

  override saveFinalEstimate(command: SaveFinalEstimateCommand): Promise<RoomCommandResult> {
    this.lastSaveFinalEstimate = command;
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
  completed?: boolean;
  addedTaskTitle?: string;
  activeRound?: boolean;
  finalEstimate?: number;
} = {}): RoomSnapshot {
  const now = new Date().toISOString();
  const tasks: PlanningTask[] = [
    {
      taskId: 'task-1',
      title: 'Archived task',
      details: '',
      status: 'estimated' as const,
      finalEstimate: {
        value: 2,
        roundId: 'round-1',
        savedAt: now,
        archived: true,
      },
    },
    {
      taskId: 'task-2',
      title: 'Current task',
      details: '',
      status: options.activeRound ? 'estimating' as const : 'estimated' as const,
      finalEstimate: options.finalEstimate ? {
        value: options.finalEstimate,
        roundId: 'round-2',
        savedAt: now,
        archived: false,
      } : null,
    },
  ];

  if (options.addedTaskTitle) {
    tasks.push({
      taskId: 'task-3',
      title: options.addedTaskTitle,
      details: '',
      status: 'unestimated',
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
        role: 'facilitator',
        presence: 'connected',
        lastSeenAt: now,
      },
    ],
    planningSession: {
      estimateCards: ['0', '1', '2', '3', '5', '8', '13', '21', '?'],
      tasks,
      currentTaskId: 'task-2',
      activeRound: options.activeRound ? {
        roundId: 'round-2',
        taskId: 'task-2',
        status: 'revealed',
        createdAt: now,
        revealedAt: now,
        closedAt: null,
        computedAverage: 5,
        votes: [],
      } : null,
      completedRounds: [],
      archivedEstimateTotal: 2,
      estimationStatus: options.completed ? 'completed' : 'active',
      completedTotalEstimate: options.completed ? 7 : null,
    },
  };
}
