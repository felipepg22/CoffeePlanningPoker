import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
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
    expect(router.navigate).toHaveBeenCalledWith(['/rooms', 'brew-482'], { replaceUrl: true });
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
