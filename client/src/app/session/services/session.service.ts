import { Injectable, computed, inject, signal } from '@angular/core';

import { RoomCommandResult, RoomError, RoomParticipant, RoomSnapshot } from '../../rooms/models/room-session';
import { RoomGateway } from '../../rooms/services/room-gateway';
import { RoomService } from '../../rooms/services/room.service';
import { ESTIMATE_CARDS, EstimateValue, ParticipantVote, SessionPendingAction } from '../models/planning-round';

export interface ParticipantVoteRow extends RoomParticipant {
  hasVoted: boolean;
  estimate: EstimateValue | null;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly room = inject(RoomService);
  private readonly gateway = inject(RoomGateway);

  private readonly pendingActionSignal = signal<SessionPendingAction>(null);
  private readonly errorSignal = signal<RoomError | null>(null);

  readonly pendingAction = this.pendingActionSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly estimateCards = computed(() => this.room.planningSession()?.estimateCards ?? ESTIMATE_CARDS);
  readonly activeRound = computed(() => this.room.planningSession()?.activeRound ?? null);
  readonly votesRevealed = computed(() => this.activeRound()?.status === 'revealed' || this.activeRound()?.status === 'closed');
  readonly computedAverage = computed(() => this.activeRound()?.computedAverage ?? null);
  readonly localVote = computed(() => {
    const localParticipantId = this.room.activeRoom()?.localParticipantId;
    return this.activeRound()?.votes.find((vote) => vote.participantId === localParticipantId)?.estimate ?? null;
  });
  readonly participantRows = computed<readonly ParticipantVoteRow[]>(() => {
    const votes = new Map<string, ParticipantVote>(
      (this.activeRound()?.votes ?? []).map((vote) => [vote.participantId, vote]),
    );

    return this.room.participants().map((participant) => {
      const vote = votes.get(participant.participantId);
      return {
        ...participant,
        hasVoted: vote?.hasVoted ?? false,
        estimate: vote?.estimate ?? null,
      };
    });
  });
  readonly totalVoters = computed(() => this.participantRows().length);
  readonly votedCount = computed(() => this.participantRows().filter((participant) => participant.hasVoted).length);
  readonly voteProgress = computed(() => {
    const total = this.totalVoters();
    return total === 0 ? 0 : Math.round((this.votedCount() / total) * 100);
  });
  readonly readinessLabel = computed(() => `${this.votedCount()} of ${this.totalVoters()} voted`);
  readonly canVote = computed(() => this.activeRound()?.status === 'voting' && this.pendingActionSignal() !== 'castVote');
  readonly canReveal = computed(() =>
    this.room.isFacilitator() &&
    this.activeRound()?.status === 'voting' &&
    this.votedCount() > 0 &&
    this.pendingActionSignal() === null,
  );
  readonly canReset = computed(() => this.room.isFacilitator() && this.room.planningSession()?.currentTaskId !== null && this.pendingActionSignal() === null);

  async castVote(estimate: EstimateValue): Promise<boolean> {
    const round = this.activeRound();
    if (!round) {
      this.errorSignal.set({
        code: 'no_active_task',
        message: 'Select a task before voting.',
      });
      return false;
    }

    return this.run('castVote', (room) => this.gateway.castVote({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
      roundId: round.roundId,
      estimate,
    }));
  }

  async revealVotes(): Promise<boolean> {
    const round = this.activeRound();
    if (!round) {
      return false;
    }

    return this.run('revealVotes', (room) => this.gateway.revealVotes({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
      roundId: round.roundId,
    }));
  }

  async resetRound(taskId: string | null = this.room.planningSession()?.currentTaskId ?? null): Promise<boolean> {
    if (!taskId) {
      this.errorSignal.set({
        code: 'no_active_task',
        message: 'Select a task before starting a re-vote.',
      });
      return false;
    }

    return this.run('resetRound', (room) => this.gateway.resetRound({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
      taskId,
    }));
  }

  async startNextRound(taskId: string | null = null): Promise<boolean> {
    return this.run('startNextRound', (room) => this.gateway.startNextRound({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
      taskId,
    }));
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private async run(
    pendingAction: Exclude<SessionPendingAction, null>,
    invoke: (room: RoomSnapshot) => Promise<RoomCommandResult>,
  ): Promise<boolean> {
    const room = this.room.activeRoom();
    if (!room) {
      this.errorSignal.set({
        code: 'room_unavailable',
        message: 'Join a room before voting.',
      });
      return false;
    }

    this.pendingActionSignal.set(pendingAction);
    this.errorSignal.set(null);
    const result = await invoke(room);
    this.pendingActionSignal.set(null);
    const success = this.room.applyCommandResult(result);
    if (!success && result.error) {
      this.errorSignal.set(result.error);
    }

    return success;
  }
}
