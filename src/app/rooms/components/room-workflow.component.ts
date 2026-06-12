import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { IdentityService } from '../../identity/services/identity.service';
import { ParticipantPresence, RoomParticipant } from '../models/room-session';
import { RoomService } from '../services/room.service';
import {
  normalizeRoomCode,
  parseInviteRoomCode,
  validateDisplayName,
  validateRoomCode,
  validateRoomName,
} from '../services/room-validation';

type EstimateValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?';
type TaskStatus = 'ready' | 'estimating' | 'estimated';
type RoomMode = 'create' | 'join';

interface ParticipantRow extends RoomParticipant {
  vote: EstimateValue | null;
}

interface PlanningTask {
  id: string;
  title: string;
  details: string;
  estimate: EstimateValue | null;
  status: TaskStatus;
}

@Component({
  selector: 'app-room-workflow',
  imports: [],
  templateUrl: './room-workflow.component.html',
  styleUrl: '../../app.component.css',
})
export class RoomWorkflowComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly identity = inject(IdentityService);
  private readonly document = inject(DOCUMENT);
  readonly room = inject(RoomService);

  readonly estimateCards: readonly EstimateValue[] = ['0', '1', '2', '3', '5', '8', '13', '21', '?'];

  readonly roomMode = signal<RoomMode>('create');
  readonly roomName = signal('');
  readonly joinCode = signal('');
  readonly displayName = signal(this.identity.displayName());
  readonly setupError = signal('');

  readonly newTaskTitle = signal('');
  readonly newTaskDetails = signal('');
  readonly taskError = signal('');

  readonly activeTaskId = signal('task-checkout');
  readonly selectedEstimate = signal<EstimateValue | null>(null);
  readonly votesRevealed = signal(false);
  readonly finalEstimate = signal<EstimateValue | null>(null);
  readonly isSyncing = signal(false);
  readonly notice = signal('Create a room or join with a code.');

  readonly activeRoom = this.room.activeRoom;
  readonly setupMessage = computed(() => this.setupError() || this.room.error()?.message || '');
  readonly isBusy = computed(() => this.room.pendingAction() !== null);
  readonly copyInviteLabel = computed(() => this.room.inviteCopied() ? 'Copied' : 'Copy invite');
  readonly connectionLabel = computed(() => {
    const state = this.room.connectionState();
    if (state === 'connected') {
      return 'Connected';
    }

    if (state === 'reconnecting' || state === 'connecting') {
      return 'Reconnecting';
    }

    if (state === 'disconnected') {
      return 'Disconnected';
    }

    return 'Not connected';
  });

  readonly tasks = signal<PlanningTask[]>([
    {
      id: 'task-checkout',
      title: 'Persist final estimate after reveal',
      details: 'Save the agreed estimate to the selected backlog item and keep the round state recoverable after refresh.',
      estimate: null,
      status: 'estimating',
    },
    {
      id: 'task-presence',
      title: 'Show participant reconnect state',
      details: 'Make stale connections obvious without blocking the facilitator from continuing the round.',
      estimate: '5',
      status: 'estimated',
    },
    {
      id: 'task-join',
      title: 'Allow invite code joins',
      details: 'Let teammates enter a room code and land in the current round with their display name.',
      estimate: null,
      status: 'ready',
    },
  ]);

  readonly activeTask = computed(() => this.tasks().find((task) => task.id === this.activeTaskId()) ?? null);

  readonly participantRows = computed<readonly ParticipantRow[]>(() => {
    const localParticipantId = this.activeRoom()?.localParticipantId;
    return this.room.participants().map((participant) => ({
      ...participant,
      vote: participant.participantId === localParticipantId ? this.selectedEstimate() : null,
    }));
  });
  readonly totalVoters = computed(() => this.participantRows().length);
  readonly votedCount = computed(() => this.participantRows().filter((participant) => participant.vote !== null).length);
  readonly voteProgress = computed(() => {
    const total = this.totalVoters();
    return total === 0 ? 0 : Math.round((this.votedCount() / total) * 100);
  });
  readonly readinessLabel = computed(() => `${this.votedCount()} of ${this.totalVoters()} voted`);

  readonly suggestedEstimate = computed<EstimateValue | null>(() => {
    if (!this.votesRevealed()) {
      return null;
    }

    const counts = new Map<EstimateValue, number>();
    for (const participant of this.participantRows()) {
      if (participant.vote === null || participant.vote === '?') {
        continue;
      }
      counts.set(participant.vote, (counts.get(participant.vote) ?? 0) + 1);
    }

    let winner: EstimateValue | null = null;
    let winningCount = 0;

    for (const card of this.estimateCards) {
      if (card === '?') {
        continue;
      }
      const count = counts.get(card) ?? 0;
      if (count > winningCount) {
        winner = card;
        winningCount = count;
      }
    }

    return winner;
  });

  readonly splitNeedsDiscussion = computed(() => {
    if (!this.votesRevealed()) {
      return false;
    }

    const numericVotes = this.participantRows()
      .map((participant) => participant.vote)
      .filter((vote): vote is Exclude<EstimateValue, '?'> => vote !== null && vote !== '?')
      .map(Number);

    if (numericVotes.length < 2) {
      return false;
    }

    return Math.max(...numericVotes) - Math.min(...numericVotes) >= 5;
  });

  readonly canReveal = computed(() => this.votedCount() > 0 && !this.votesRevealed());
  readonly canSaveEstimate = computed(() => this.votesRevealed() && this.suggestedEstimate() !== null && !this.isSyncing());

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const rawCode = params.get('roomCode');
        if (!rawCode) {
          return;
        }

        const roomCode = parseInviteRoomCode(`/rooms/${rawCode}`) ?? normalizeRoomCode(rawCode);
        this.roomMode.set('join');
        this.joinCode.set(roomCode);
        this.setupError.set('');

        if (!validateRoomCode(roomCode).valid) {
          this.setupError.set('That invite link is not valid.');
          this.focusSoon('join-code');
          return;
        }

        if (this.activeRoom()?.roomCode === roomCode) {
          return;
        }

        if (this.room.hasRecoverableAnchor(roomCode)) {
          void this.resumeFromRoute(roomCode);
        } else {
          this.focusSoon('display-name-join');
        }
      });
  }

  setRoomMode(mode: RoomMode): void {
    this.roomMode.set(mode);
    this.setupError.set('');
    this.room.clearError();
    this.focusSoon(mode === 'create' ? 'room-name' : 'join-code');
  }

  updateRoomName(event: Event): void {
    this.roomName.set(this.inputValue(event));
  }

  updateJoinCode(event: Event): void {
    this.joinCode.set(normalizeRoomCode(this.inputValue(event)));
  }

  updateDisplayName(event: Event): void {
    this.displayName.set(this.inputValue(event));
  }

  updateTaskTitle(event: Event): void {
    this.newTaskTitle.set(this.inputValue(event));
    this.taskError.set('');
  }

  updateTaskDetails(event: Event): void {
    this.newTaskDetails.set(this.textareaValue(event));
  }

  async startRoom(event: Event, mode: RoomMode): Promise<void> {
    event.preventDefault();
    this.setupError.set('');
    this.room.clearError();

    const displayName = this.displayName().trim();
    const displayValidation = validateDisplayName(displayName);
    if (!displayValidation.valid) {
      this.setupError.set(displayValidation.message);
      this.focusSoon(mode === 'create' ? 'display-name-create' : 'display-name-join');
      return;
    }

    if (mode === 'create') {
      const roomName = this.roomName().trim();
      const roomValidation = validateRoomName(roomName);
      if (!roomValidation.valid) {
        this.setupError.set(roomValidation.message);
        this.focusSoon('room-name');
        return;
      }

      const created = await this.room.createRoom(roomName, displayName);
      if (created) {
        const activeRoom = this.activeRoom();
        this.notice.set(`${activeRoom?.roomCode ?? 'Room'} is live. Start voting when the team is ready.`);
        await this.navigateToActiveRoom();
        this.focusSoon('active-task-title');
      }
      return;
    }

    const roomCode = normalizeRoomCode(this.joinCode());
    const codeValidation = validateRoomCode(roomCode);
    if (!codeValidation.valid) {
      this.setupError.set(codeValidation.message);
      this.focusSoon('join-code');
      return;
    }

    const joined = await this.room.joinRoom(roomCode, displayName);
    if (joined) {
      this.notice.set(`Joined ${roomCode}. Your vote is hidden until reveal.`);
      await this.navigateToActiveRoom();
      this.focusSoon('active-task-title');
    }
  }

  async leaveRoom(): Promise<void> {
    await this.room.leaveRoom();
    this.selectedEstimate.set(null);
    this.votesRevealed.set(false);
    this.finalEstimate.set(null);
    this.notice.set('Left the room.');
    await this.router.navigate(['/']);
    this.focusSoon('room-name');
  }

  async copyRoomLink(): Promise<void> {
    await this.room.copyInviteLink();
    this.notice.set(this.room.announcement());
  }

  addTask(event: Event): void {
    event.preventDefault();

    const title = this.newTaskTitle().trim();
    if (title.length < 3) {
      this.taskError.set('Add a task title before starting a new round.');
      return;
    }

    const id = `task-${Date.now()}`;
    const task: PlanningTask = {
      id,
      title,
      details: this.newTaskDetails().trim() || 'Estimate this task with the current room.',
      estimate: null,
      status: 'ready',
    };

    this.tasks.update((tasks) => [task, ...tasks]);
    this.newTaskTitle.set('');
    this.newTaskDetails.set('');
    this.taskError.set('');
    this.selectTask(id);
    this.notice.set('Task added. Votes are reset for the new round.');
  }

  selectTask(taskId: string): void {
    this.activeTaskId.set(taskId);
    this.selectedEstimate.set(null);
    this.votesRevealed.set(false);
    this.finalEstimate.set(null);
    this.tasks.update((tasks) => tasks.map((task) => ({
      ...task,
      status: task.id === taskId && task.estimate === null ? 'estimating' : task.status,
    })));
  }

  castVote(value: EstimateValue): void {
    if (this.votesRevealed()) {
      return;
    }

    this.selectedEstimate.set(value);
    this.notice.set(`Your ${value} vote is saved. You can change it until reveal.`);
  }

  revealVotes(): void {
    if (!this.canReveal()) {
      this.notice.set('Wait for at least one vote before revealing.');
      return;
    }

    this.votesRevealed.set(true);
    this.notice.set(this.splitNeedsDiscussion() ? 'Votes are split. Discuss the high and low estimates first.' : 'Votes are revealed. Save the final estimate when the team agrees.');
  }

  saveFinalEstimate(): void {
    const estimate = this.suggestedEstimate();
    const activeTask = this.activeTask();

    if (estimate === null || activeTask === null) {
      return;
    }

    this.isSyncing.set(true);
    this.tasks.update((tasks) => tasks.map((task) => task.id === activeTask.id ? {
      ...task,
      estimate,
      status: 'estimated',
    } : task));
    this.finalEstimate.set(estimate);
    this.notice.set(`Saved ${estimate} points for ${activeTask.title}.`);

    window.setTimeout(() => this.isSyncing.set(false), 420);
  }

  startNextRound(): void {
    this.selectedEstimate.set(null);
    this.votesRevealed.set(false);
    this.finalEstimate.set(null);
    this.notice.set('New round ready. Pick a card when discussion is done.');
  }

  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'YP';
  }

  statusLabel(participant: ParticipantRow): string {
    const presenceLabel = this.presenceLabel(participant.presence);
    if (presenceLabel !== 'Here') {
      return presenceLabel;
    }

    if (this.votesRevealed() && participant.vote !== null) {
      return `${participant.vote} points`;
    }

    return participant.vote === null ? 'Thinking' : 'Voted';
  }

  presenceLabel(presence: ParticipantPresence): string {
    if (presence === 'reconnecting') {
      return 'Reconnecting';
    }

    if (presence === 'disconnected') {
      return 'Disconnected';
    }

    if (presence === 'left') {
      return 'Left';
    }

    return 'Here';
  }

  taskStatusLabel(status: TaskStatus): string {
    if (status === 'estimated') {
      return 'Estimated';
    }

    if (status === 'estimating') {
      return 'In round';
    }

    return 'Ready';
  }

  private async resumeFromRoute(roomCode: string): Promise<void> {
    const resumed = await this.room.resumeRoom(roomCode);
    if (resumed) {
      this.displayName.set(this.identity.displayName());
      this.notice.set(`Rejoined ${roomCode}.`);
      this.focusSoon('active-task-title');
      return;
    }

    this.roomMode.set('join');
    this.setupError.set('We could not resume that room. Enter your name to join again.');
    this.focusSoon('display-name-join');
  }

  private async navigateToActiveRoom(): Promise<void> {
    const roomCode = this.activeRoom()?.roomCode;
    if (roomCode) {
      await this.router.navigate(['/rooms', roomCode.toLowerCase()], { replaceUrl: true });
    }
  }

  private focusSoon(id: string): void {
    window.setTimeout(() => {
      this.document.getElementById(id)?.focus();
    });
  }

  private inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private textareaValue(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }
}
