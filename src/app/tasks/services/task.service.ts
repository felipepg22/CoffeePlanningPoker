import { Injectable, computed, inject, signal } from '@angular/core';

import { PlanningRound } from '../../session/models/planning-round';
import { RoomCommandResult, RoomError, RoomSnapshot } from '../../rooms/models/room-session';
import { RoomGateway } from '../../rooms/services/room-gateway';
import { RoomService } from '../../rooms/services/room.service';
import { PlanningTask, TaskPendingAction } from '../models/planning-task';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly room = inject(RoomService);
  private readonly gateway = inject(RoomGateway);

  private readonly pendingActionSignal = signal<TaskPendingAction>(null);
  private readonly errorSignal = signal<RoomError | null>(null);

  readonly pendingAction = this.pendingActionSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly tasks = computed(() => this.room.planningSession()?.tasks ?? []);
  readonly currentTask = computed<PlanningTask | null>(() => {
    const currentTaskId = this.room.planningSession()?.currentTaskId;
    return this.tasks().find((task) => task.taskId === currentTaskId) ?? null;
  });
  readonly completedRounds = computed(() => this.room.planningSession()?.completedRounds ?? []);
  readonly archivedEstimateTotal = computed(() => this.room.planningSession()?.archivedEstimateTotal ?? 0);
  readonly estimationStatus = computed(() => this.room.planningSession()?.estimationStatus ?? 'active');
  readonly completedTotalEstimate = computed(() => this.room.planningSession()?.completedTotalEstimate ?? null);
  readonly canComplete = computed(() => this.room.isFacilitator() && this.estimationStatus() !== 'completed' && this.pendingActionSignal() === null);

  async addTask(title: string, details: string): Promise<boolean> {
    const normalizedTitle = title.trim();
    if (normalizedTitle.length < 3) {
      this.errorSignal.set({
        code: 'invalid_task_title',
        message: 'Add a task title before starting a new round.',
      });
      return false;
    }

    return this.run('addTask', (room) => this.gateway.addTask({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
      title: normalizedTitle,
      details: details.trim() || null,
    }));
  }

  async selectTask(taskId: string): Promise<boolean> {
    return this.run('selectTask', (room) => this.gateway.selectTask({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
      taskId,
    }));
  }

  async saveFinalEstimate(round: PlanningRound | null = this.room.planningSession()?.activeRound ?? null): Promise<boolean> {
    const task = this.currentTask();
    if (!task || !round) {
      this.errorSignal.set({
        code: 'no_active_task',
        message: 'Select a task before saving an estimate.',
      });
      return false;
    }

    return this.run('saveFinalEstimate', (room) => this.gateway.saveFinalEstimate({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
      taskId: task.taskId,
      roundId: round.roundId,
    }));
  }

  async completeEstimation(): Promise<boolean> {
    return this.run('completeEstimation', (room) => this.gateway.completeEstimation({
      roomCode: room.roomCode,
      participantId: room.localParticipantId,
    }));
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private async run(
    pendingAction: Exclude<TaskPendingAction, null>,
    invoke: (room: RoomSnapshot) => Promise<RoomCommandResult>,
  ): Promise<boolean> {
    const room = this.room.activeRoom();
    if (!room) {
      this.errorSignal.set({
        code: 'room_unavailable',
        message: 'Join a room before changing tasks.',
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
