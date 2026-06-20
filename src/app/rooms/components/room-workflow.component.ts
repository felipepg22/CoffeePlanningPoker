import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { IdentityService } from '../../identity/services/identity.service';
import { EstimateValue } from '../../session/models/planning-round';
import { ParticipantVoteRow, SessionService } from '../../session/services/session.service';
import { PlanningTask } from '../../tasks/models/planning-task';
import { TaskService } from '../../tasks/services/task.service';
import { ParticipantPresence } from '../models/room-session';
import { RoomService } from '../services/room.service';
import {
  normalizeRoomCode,
  parseInviteRoomCode,
  validateDisplayName,
  validateRoomCode,
  validateRoomName,
} from '../services/room-validation';

type RoomMode = 'create' | 'join';

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
  readonly session = inject(SessionService);
  readonly taskState = inject(TaskService);

  readonly roomMode = signal<RoomMode>('create');
  readonly roomName = signal('');
  readonly joinCode = signal('');
  readonly displayName = signal(this.identity.displayName());
  readonly setupError = signal('');

  readonly newTaskTitle = signal('');
  readonly newTaskDetails = signal('');
  readonly taskError = signal('');
  readonly notice = signal('Create a room or join with a code.');

  readonly activeRoom = this.room.activeRoom;
  readonly activeTask = this.taskState.currentTask;
  readonly tasks = this.taskState.tasks;
  readonly participantRows = this.session.participantRows;
  readonly totalVoters = this.session.totalVoters;
  readonly votedCount = this.session.votedCount;
  readonly voteProgress = this.session.voteProgress;
  readonly readinessLabel = this.session.readinessLabel;
  readonly selectedEstimate = this.session.localVote;
  readonly votesRevealed = this.session.votesRevealed;
  readonly suggestedEstimate = this.session.computedAverage;
  readonly setupMessage = computed(() => this.setupError() || this.room.error()?.message || '');
  readonly isBusy = computed(() => this.room.pendingAction() !== null);
  readonly isCommandBusy = computed(() => this.session.pendingAction() !== null || this.taskState.pendingAction() !== null);
  readonly taskMessage = computed(() => this.taskError() || this.taskState.error()?.message || this.session.error()?.message || '');
  readonly copyInviteLabel = computed(() => this.room.inviteCopied() ? 'Copied' : 'Copy invite');
  readonly canSaveEstimate = computed(() =>
    this.room.isFacilitator() &&
    this.votesRevealed() &&
    this.suggestedEstimate() !== null &&
    this.taskState.pendingAction() === null,
  );
  readonly canComplete = this.taskState.canComplete;
  readonly completedTotal = this.taskState.completedTotalEstimate;
  readonly archivedEstimateTotal = this.taskState.archivedEstimateTotal;
  readonly isCompleted = computed(() => this.taskState.estimationStatus() === 'completed');
  readonly splitNeedsDiscussion = computed(() => {
    if (!this.votesRevealed()) {
      return false;
    }

    const numericVotes = this.participantRows()
      .map((participant) => participant.estimate)
      .filter((vote): vote is Exclude<EstimateValue, '?'> => vote !== null && vote !== '?')
      .map(Number);

    if (numericVotes.length < 2) {
      return false;
    }

    return Math.max(...numericVotes) - Math.min(...numericVotes) >= 5;
  });
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
    this.taskState.clearError();
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
        this.notice.set(`${activeRoom?.roomCode ?? 'Room'} is live. Add a task to begin.`);
        await this.navigateToActiveRoom();
        this.focusSoon('task-title');
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
    this.notice.set('Left the room.');
    await this.router.navigate(['/']);
    this.focusSoon('room-name');
  }

  async copyRoomLink(): Promise<void> {
    await this.room.copyInviteLink();
    this.notice.set(this.room.announcement());
  }

  async addTask(event: Event): Promise<void> {
    event.preventDefault();
    this.taskError.set('');
    this.taskState.clearError();

    const title = this.newTaskTitle().trim();
    if (title.length < 3) {
      this.taskError.set('Add a task title before starting a new round.');
      return;
    }

    const added = await this.taskState.addTask(title, this.newTaskDetails());
    if (!added) {
      return;
    }

    this.newTaskTitle.set('');
    this.newTaskDetails.set('');
    this.notice.set('Task added.');

    if (this.room.isFacilitator()) {
      const task = this.tasks().at(-1);
      if (task) {
        await this.selectTask(task.taskId);
      }
    }
  }

  async selectTask(taskId: string): Promise<void> {
    this.taskError.set('');
    const selected = await this.taskState.selectTask(taskId);
    if (selected) {
      this.notice.set('Task selected. Votes are ready.');
      this.focusSoon('active-task-title');
    }
  }

  async castVote(value: EstimateValue): Promise<void> {
    const voted = await this.session.castVote(value);
    if (voted) {
      this.notice.set(`Your ${value} vote is saved. You can change it until reveal.`);
    }
  }

  async revealVotes(): Promise<void> {
    const revealed = await this.session.revealVotes();
    if (revealed) {
      this.notice.set(this.splitNeedsDiscussion() ? 'Votes are split. Discuss the high and low estimates first.' : 'Votes are revealed. Save the final estimate when the team agrees.');
    }
  }

  async saveFinalEstimate(): Promise<void> {
    const task = this.activeTask();
    const estimate = this.suggestedEstimate();
    const saved = await this.taskState.saveFinalEstimate(this.session.activeRound());
    if (saved && task) {
      this.notice.set(`Saved ${this.formatEstimate(estimate)} points for ${task.title}.`);
    }
  }

  async startReVote(): Promise<void> {
    const task = this.activeTask();
    if (!task) {
      return;
    }

    const started = await this.session.resetRound(task.taskId);
    if (started) {
      this.notice.set('New vote ready. Prior saved estimate stays until a newer one is saved.');
    }
  }

  async startNextRound(): Promise<void> {
    const started = await this.session.startNextRound();
    if (started) {
      this.notice.set('Next round ready. Pick a card when discussion is done.');
      this.focusSoon('active-task-title');
    }
  }

  async completeEstimation(): Promise<void> {
    const completed = await this.taskState.completeEstimation();
    if (completed) {
      this.notice.set(`Project estimate total is ${this.formatEstimate(this.completedTotal())}.`);
    }
  }

  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'YP';
  }

  statusLabel(participant: ParticipantVoteRow): string {
    const presenceLabel = this.presenceLabel(participant.presence);
    if (presenceLabel !== 'Here') {
      return presenceLabel;
    }

    if (this.votesRevealed() && participant.estimate !== null) {
      return `${participant.estimate} points`;
    }

    return participant.hasVoted ? 'Voted' : 'Thinking';
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

  taskStatusLabel(task: PlanningTask): string {
    if (task.status === 'estimated') {
      return 'Estimated';
    }

    if (task.status === 'estimating') {
      return task.finalEstimate ? 'Re-vote' : 'In round';
    }

    return 'Ready';
  }

  formatEstimate(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return 'Open';
    }

    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }

  hasActiveRound(): boolean {
    return this.session.activeRound() !== null;
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
