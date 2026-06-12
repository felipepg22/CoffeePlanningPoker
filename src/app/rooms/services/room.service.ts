import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IdentityService } from '../../identity/services/identity.service';
import {
  RecoveryAnchor,
  RoomConnectionState,
  RoomError,
  RoomParticipant,
  RoomPendingAction,
  RoomSnapshot,
} from '../models/room-session';
import { RoomGateway } from './room-gateway';
import { RoomPersistence } from './room-persistence';
import { normalizeRoomCode } from './room-validation';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly gateway = inject(RoomGateway);
  private readonly identity = inject(IdentityService);
  private readonly persistence = inject(RoomPersistence);
  private readonly destroyRef = inject(DestroyRef);

  private readonly activeRoomSignal = signal<RoomSnapshot | null>(null);
  private readonly participantsSignal = signal<readonly RoomParticipant[]>([]);
  private readonly connectionStateSignal = signal<RoomConnectionState>('idle');
  private readonly pendingActionSignal = signal<RoomPendingAction>(null);
  private readonly errorSignal = signal<RoomError | null>(null);
  private readonly inviteCopiedSignal = signal(false);
  private readonly announcementSignal = signal('');

  readonly activeRoom = this.activeRoomSignal.asReadonly();
  readonly participants = this.participantsSignal.asReadonly();
  readonly connectionState = this.connectionStateSignal.asReadonly();
  readonly pendingAction = this.pendingActionSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly inviteCopied = this.inviteCopiedSignal.asReadonly();
  readonly announcement = this.announcementSignal.asReadonly();
  readonly isActive = computed(() => this.activeRoomSignal() !== null);

  constructor() {
    this.gateway.connectionState$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.connectionStateSignal.set(state));

    this.gateway.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type === 'snapshot') {
          this.applySnapshot(event.snapshot);
          return;
        }

        if (event.type === 'error') {
          this.errorSignal.set(event.error);
          return;
        }

        this.applyParticipantEvent(event.type, event.event.participant);
      });
  }

  hasRecoverableAnchor(roomCode: string): boolean {
    return this.persistence.read(roomCode) !== null;
  }

  async createRoom(roomName: string, displayName: string): Promise<boolean> {
    this.pendingActionSignal.set('create');
    this.errorSignal.set(null);
    this.identity.setDisplayName(displayName);

    const result = await this.gateway.createRoom({
      roomName: roomName.trim(),
      displayName: displayName.trim(),
      participantId: this.identity.participantId(),
    });

    this.pendingActionSignal.set(null);
    return this.handleCommandResult(result.snapshot, result.error, displayName);
  }

  async joinRoom(roomCode: string, displayName: string): Promise<boolean> {
    this.pendingActionSignal.set('join');
    this.errorSignal.set(null);
    this.identity.setDisplayName(displayName);

    const result = await this.gateway.joinRoom({
      roomCode: normalizeRoomCode(roomCode),
      displayName: displayName.trim(),
      participantId: this.identity.participantId(),
    });

    this.pendingActionSignal.set(null);
    return this.handleCommandResult(result.snapshot, result.error, displayName);
  }

  async resumeRoom(roomCode: string): Promise<boolean> {
    const anchor = this.persistence.read(roomCode);
    if (!anchor) {
      return false;
    }

    this.pendingActionSignal.set('resume');
    this.errorSignal.set(null);

    const result = await this.gateway.resumeRoom({
      roomCode: anchor.roomCode,
      participantId: anchor.participantId,
      resumeToken: anchor.resumeToken,
    });

    this.pendingActionSignal.set(null);
    const success = this.handleCommandResult(result.snapshot, result.error, anchor.displayName);
    if (!success) {
      this.persistence.clear(anchor.roomCode);
    }

    return success;
  }

  async leaveRoom(): Promise<void> {
    const room = this.activeRoomSignal();
    if (!room) {
      return;
    }

    this.pendingActionSignal.set('leave');
    await this.gateway.leaveRoom({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
    });
    this.pendingActionSignal.set(null);
    this.persistence.clear(room.roomCode);
    this.activeRoomSignal.set(null);
    this.participantsSignal.set([]);
    this.announcementSignal.set('Left the room.');
  }

  async heartbeat(): Promise<void> {
    const room = this.activeRoomSignal();
    if (!room) {
      return;
    }

    await this.gateway.heartbeat({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
    });
  }

  async copyInviteLink(): Promise<void> {
    const inviteUrl = this.activeRoomSignal()?.inviteUrl;
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      this.inviteCopiedSignal.set(true);
      this.announcementSignal.set('Room link copied.');
      window.setTimeout(() => this.inviteCopiedSignal.set(false), 1800);
    } catch {
      this.inviteCopiedSignal.set(false);
      this.announcementSignal.set(`Share code ${this.activeRoomSignal()?.roomCode ?? ''}.`);
    }
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private handleCommandResult(snapshot: RoomSnapshot | null, error: RoomError | null, displayName: string): boolean {
    if (snapshot) {
      this.applySnapshot(snapshot);
      this.persistence.save(snapshot, displayName);
      return true;
    }

    if (error) {
      this.errorSignal.set(error);
    }

    return false;
  }

  private applySnapshot(snapshot: RoomSnapshot): void {
    this.activeRoomSignal.set(snapshot);
    this.participantsSignal.set(snapshot.participants);
    this.connectionStateSignal.set('connected');
    this.errorSignal.set(null);
    this.announcementSignal.set(`${snapshot.roomCode} is live.`);
  }

  private applyParticipantEvent(type: string, participant: RoomParticipant): void {
    this.participantsSignal.update((participants) => {
      const index = participants.findIndex((existing) => existing.participantId === participant.participantId);
      if (index === -1) {
        return [...participants, participant];
      }

      return participants.map((existing) => existing.participantId === participant.participantId ? participant : existing);
    });

    if (type === 'participantJoined') {
      this.announcementSignal.set(`${participant.displayName} joined.`);
    } else if (type === 'participantLeft') {
      this.announcementSignal.set(`${participant.displayName} left.`);
    } else if (participant.presence === 'reconnecting') {
      this.announcementSignal.set(`${participant.displayName} is reconnecting.`);
    } else if (participant.presence === 'connected') {
      this.announcementSignal.set(`${participant.displayName} reconnected.`);
    }
  }
}
