import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideBookmark,
  LucideCheckCircle,
  LucideChevronDown,
  LucideChevronRight,
  LucideCloud,
  LucideCopy,
  LucideEye,
  LucideFilter,
  LucideGlobe,
  LucideGripVertical,
  LucideLink,
  LucideLogOut,
  LucideMoreVertical,
  LucidePlus,
  LucideSave,
  LucideSearch,
  LucideSettings,
  LucideUserPlus,
  LucideUsers,
} from '@lucide/angular';

import { IdentityService } from '../../identity/services/identity.service';
import { EstimateValue } from '../../session/models/planning-round';
import { ParticipantVoteRow, SessionService } from '../../session/services/session.service';
import { formatAppEstimate } from '../../shared/i18n/estimate-format';
import { I18nService } from '../../shared/i18n/i18n.service';
import { LocaleSelectorComponent } from '../../shared/i18n/locale-selector.component';
import { localizedPathFor } from '../../shared/i18n/locales';
import { roomErrorMessage, validationMessage } from '../../shared/i18n/messages';
import { PlanningTask } from '../../tasks/models/planning-task';
import { TaskService } from '../../tasks/services/task.service';
import { ParticipantPresence, PlanningPokerRoomMode } from '../models/room-session';
import { RoomService } from '../services/room.service';
import {
  normalizeRoomCode,
  parseInviteRoomCode,
  validateDisplayName,
  validateRoomCode,
  validateRoomName,
  validateTaskDetails,
  validateTaskTitle,
} from '../services/room-validation';

type EntryMode = 'create' | 'join';
type LocalizedText = () => string;

@Component({
  selector: 'app-room-workflow',
  imports: [
    LocaleSelectorComponent,
    LucideBookmark,
    LucideCheckCircle,
    LucideChevronDown,
    LucideChevronRight,
    LucideCloud,
    LucideCopy,
    LucideEye,
    LucideFilter,
    LucideGlobe,
    LucideGripVertical,
    LucideLink,
    LucideLogOut,
    LucideMoreVertical,
    LucidePlus,
    LucideSave,
    LucideSearch,
    LucideSettings,
    LucideUserPlus,
    LucideUsers,
  ],
  templateUrl: './room-workflow.component.html',
  styleUrl: './room-workflow.component.css',
})
export class RoomWorkflowComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly identity = inject(IdentityService);
  private readonly document = inject(DOCUMENT);
  readonly i18n = inject(I18nService);
  readonly room = inject(RoomService);
  readonly session = inject(SessionService);
  readonly taskState = inject(TaskService);
  readonly activeLocale = this.i18n.locale;

  readonly roomMode = signal<EntryMode>('create');
  readonly selectedPlanningMode = signal<PlanningPokerRoomMode>('taskEstimation');
  readonly roomName = signal('');
  readonly joinCode = signal('');
  readonly displayName = signal(this.identity.displayName());
  readonly setupError = signal<LocalizedText | null>(null);

  readonly newTaskTitle = signal('');
  readonly newTaskDetails = signal('');
  readonly taskError = signal<LocalizedText | null>(null);
  readonly taskSearch = signal('');
  readonly participantSearch = signal('');
  readonly addTaskOpen = signal(true);
  readonly notice = signal<LocalizedText | null>(() => this.i18n.t('notice.entryReady', 'Create a room or join with a code.'));

  readonly activeRoom = this.room.activeRoom;
  readonly isSimplePlanningPoker = computed(() => this.activeRoom()?.roomMode === 'simplePlanningPoker');
  readonly stageTitle = computed(() => this.isSimplePlanningPoker()
    ? this.i18n.t('heading.currentVote', 'Current vote')
    : this.activeTask()?.title ?? '');
  readonly activeTask = this.taskState.currentTask;
  readonly tasks = this.taskState.tasks;
  readonly participantRows = this.session.participantRows;
  readonly totalVoters = this.session.totalVoters;
  readonly votedCount = this.session.votedCount;
  readonly voteProgress = this.session.voteProgress;
  readonly filteredTasks = computed(() => {
    const query = this.taskSearch().trim().toLowerCase();
    if (!query) {
      return this.tasks();
    }

    return this.tasks().filter((task) =>
      task.title.toLowerCase().includes(query) ||
      (task.details ?? '').toLowerCase().includes(query) ||
      this.taskStatusLabel(task).toLowerCase().includes(query),
    );
  });
  readonly filteredParticipantRows = computed(() => {
    const query = this.participantSearch().trim().toLowerCase();
    if (!query) {
      return this.participantRows();
    }

    return this.participantRows().filter((participant) =>
      participant.displayName.toLowerCase().includes(query) ||
      this.presenceLabel(participant.presence).toLowerCase().includes(query) ||
      this.statusLabel(participant).toLowerCase().includes(query),
    );
  });
  readonly readinessLabel = computed(() => this.i18n.t('round.readiness', '{votedCount} of {totalVoters} voted', {
    votedCount: this.votedCount(),
    totalVoters: this.totalVoters(),
  }));
  readonly selectedEstimate = this.session.localVote;
  readonly votesRevealed = this.session.votesRevealed;
  readonly suggestedEstimate = this.session.computedAverage;
  readonly revealedVoteRange = computed(() => {
    if (!this.votesRevealed()) {
      return '';
    }

    const numericVotes = this.participantRows()
      .map((participant) => participant.estimate)
      .filter((vote): vote is Exclude<EstimateValue, '?'> => vote !== null && vote !== '?')
      .map(Number);

    if (numericVotes.length === 0) {
      return '';
    }

    return `${this.formatEstimate(Math.min(...numericVotes))} - ${this.formatEstimate(Math.max(...numericVotes))}`;
  });
  readonly setupMessage = computed(() => this.setupError()?.() || roomErrorMessage(this.room.error(), this.i18n) || '');
  readonly isBusy = computed(() => this.room.pendingAction() !== null);
  readonly isCommandBusy = computed(() => this.session.pendingAction() !== null || this.taskState.pendingAction() !== null);
  readonly taskMessage = computed(() => this.taskError()?.() || roomErrorMessage(this.taskState.error(), this.i18n) || roomErrorMessage(this.session.error(), this.i18n) || '');
  readonly noticeMessage = computed(() => this.notice()?.() ?? '');
  readonly copyInviteLabel = computed(() => this.room.inviteCopied()
    ? this.i18n.t('button.copied', 'Copied')
    : this.i18n.t('button.copyInvite', 'Copy invite'));
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
  readonly lastSyncLabel = computed(() => {
    const updatedAt = this.activeRoom()?.updatedAt;
    if (!updatedAt) {
      return this.i18n.t('sync.notStarted', 'Not synced yet');
    }

    const updated = new Date(updatedAt);
    if (Number.isNaN(updated.getTime())) {
      return this.i18n.t('sync.available', 'Sync available');
    }

    return this.i18n.t('sync.lastSync', 'Last sync: {time}', {
      time: this.i18n.formatTime(updated),
    });
  });
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
      return this.i18n.t('connection.connected', 'Connected');
    }

    if (state === 'reconnecting' || state === 'connecting') {
      return this.i18n.t('connection.reconnecting', 'Reconnecting');
    }

    if (state === 'disconnected') {
      return this.i18n.t('connection.disconnected', 'Disconnected');
    }

    return this.i18n.t('connection.notConnected', 'Not connected');
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
        this.setupError.set(null);

        if (!validateRoomCode(roomCode).valid) {
          this.setupError.set(() => this.i18n.t('error.invalidInvite', 'That invite link is not valid.'));
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

  setRoomMode(mode: EntryMode): void {
    this.roomMode.set(mode);
    this.setupError.set(null);
    this.room.clearError();
    this.focusSoon(mode === 'create' ? 'room-name' : 'join-code');
  }

  setPlanningMode(mode: PlanningPokerRoomMode): void {
    this.selectedPlanningMode.set(mode);
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
    this.taskError.set(null);
    this.taskState.clearError();
  }

  updateTaskDetails(event: Event): void {
    this.newTaskDetails.set(this.textareaValue(event));
  }

  updateTaskSearch(event: Event): void {
    this.taskSearch.set(this.inputValue(event));
  }

  updateParticipantSearch(event: Event): void {
    this.participantSearch.set(this.inputValue(event));
  }

  toggleAddTask(): void {
    this.addTaskOpen.update((isOpen) => !isOpen);
  }

  async startRoom(event: Event, mode: EntryMode): Promise<void> {
    event.preventDefault();
    this.setupError.set(null);
    this.room.clearError();

    const displayName = this.displayName().trim();
    const displayValidation = validateDisplayName(displayName);
    if (!displayValidation.valid) {
      this.setupError.set(() => validationMessage(displayValidation, this.i18n));
      this.focusSoon(mode === 'create' ? 'display-name-create' : 'display-name-join');
      return;
    }

    if (mode === 'create') {
      const roomName = this.roomName().trim();
      const roomValidation = validateRoomName(roomName);
      if (!roomValidation.valid) {
        this.setupError.set(() => validationMessage(roomValidation, this.i18n));
        this.focusSoon('room-name');
        return;
      }

      const created = await this.room.createRoom(roomName, displayName, this.selectedPlanningMode());
      if (created) {
        const activeRoom = this.activeRoom();
        this.notice.set(() => this.isSimplePlanningPoker()
          ? this.i18n.t('notice.simpleRoomCreated', '{roomCode} is live. Pick a card to begin.', { roomCode: activeRoom?.roomCode ?? 'Room' })
          : this.i18n.t('notice.roomCreated', '{roomCode} is live. Add a task to begin.', {
          roomCode: activeRoom?.roomCode ?? 'Room',
          }));
        await this.navigateToActiveRoom();
        this.focusSoon(this.isSimplePlanningPoker() ? 'active-task-title' : 'task-title');
      }
      return;
    }

    const roomCode = normalizeRoomCode(this.joinCode());
    const codeValidation = validateRoomCode(roomCode);
    if (!codeValidation.valid) {
      this.setupError.set(() => validationMessage(codeValidation, this.i18n));
      this.focusSoon('join-code');
      return;
    }

    const joined = await this.room.joinRoom(roomCode, displayName);
    if (joined) {
      this.notice.set(() => this.i18n.t('notice.roomJoined', 'Joined {roomCode}. Your vote is hidden until reveal.', { roomCode }));
      await this.navigateToActiveRoom();
      this.focusSoon('active-task-title');
    }
  }

  async leaveRoom(): Promise<void> {
    await this.room.leaveRoom();
    this.notice.set(() => this.i18n.t('notice.roomLeft', 'Left the room.'));
    await this.router.navigate([localizedPathFor(this.activeLocale(), '/')]);
    this.focusSoon('room-name');
  }

  async copyRoomLink(): Promise<void> {
    await this.room.copyInviteLink();
    this.notice.set(this.localizedRoomAnnouncement());
  }

  async addTask(event: Event): Promise<void> {
    event.preventDefault();
    this.taskError.set(null);
    this.taskState.clearError();

    const title = this.newTaskTitle().trim();
    const titleValidation = validateTaskTitle(title);
    if (!titleValidation.valid) {
      this.taskError.set(() => validationMessage(titleValidation, this.i18n));
      return;
    }

    const detailsValidation = validateTaskDetails(this.newTaskDetails());
    if (!detailsValidation.valid) {
      this.taskError.set(() => validationMessage(detailsValidation, this.i18n));
      return;
    }

    const added = await this.taskState.addTask(title, this.newTaskDetails());
    if (!added) {
      return;
    }

    this.newTaskTitle.set('');
    this.newTaskDetails.set('');
    this.notice.set(() => this.i18n.t('notice.taskAdded', 'Task added.'));

    if (this.room.isFacilitator()) {
      const task = this.tasks().at(-1);
      if (task) {
        await this.selectTask(task.taskId);
      }
    }
  }

  async selectTask(taskId: string): Promise<void> {
    this.taskError.set(null);
    const selected = await this.taskState.selectTask(taskId);
    if (selected) {
      this.notice.set(() => this.i18n.t('notice.taskSelected', 'Task selected. Votes are ready.'));
      this.focusSoon('active-task-title');
    }
  }

  async castVote(value: EstimateValue): Promise<void> {
    const voted = await this.session.castVote(value);
    if (voted) {
      this.notice.set(() => this.i18n.t('notice.voteSaved', 'Your {estimate} vote is saved. You can change it until reveal.', { estimate: value }));
    }
  }

  async revealVotes(): Promise<void> {
    const revealed = await this.session.revealVotes();
    if (revealed) {
      this.notice.set(() => this.splitNeedsDiscussion()
        ? this.i18n.t('notice.votesSplit', 'Votes are split. Discuss the high and low estimates first.')
        : this.isSimplePlanningPoker()
          ? this.i18n.t('notice.simpleVotesRevealed', 'Votes are revealed. Start a new round when discussion is done.')
          : this.i18n.t('notice.votesRevealed', 'Votes are revealed. Save the final estimate when the team agrees.'));
    }
  }

  async saveFinalEstimate(): Promise<void> {
    const task = this.activeTask();
    const estimate = this.suggestedEstimate();
    const saved = await this.taskState.saveFinalEstimate(this.session.activeRound());
    if (saved && task) {
      this.notice.set(() => this.i18n.t('notice.finalEstimateSaved', 'Saved {INTERPOLATION} points for {taskTitle}.', {
        INTERPOLATION: this.formatEstimate(estimate),
        taskTitle: task.title,
      }));
    }
  }

  async startReVote(): Promise<void> {
    const task = this.activeTask();
    if (!task) {
      return;
    }

    const started = await this.session.resetRound(task.taskId);
    if (started) {
      this.notice.set(() => this.i18n.t('notice.revoteReady', 'New vote ready. Prior saved estimate stays until a newer one is saved.'));
    }
  }

  async startNextRound(): Promise<void> {
    const started = await this.session.startNextRound();
    if (started) {
      this.notice.set(() => this.i18n.t('notice.nextRoundReady', 'Next round ready. Pick a card when discussion is done.'));
      this.focusSoon('active-task-title');
    }
  }

  async startSimplePlanningPokerRound(): Promise<void> {
    const started = await this.session.startSimplePlanningPokerRound();
    if (started) {
      this.notice.set(() => this.i18n.t('notice.simpleRoundReady', 'New round ready. Pick a card when discussion is done.'));
      this.focusSoon('active-task-title');
    }
  }

  async completeEstimation(): Promise<void> {
    const completed = await this.taskState.completeEstimation();
    if (completed) {
      this.notice.set(() => this.i18n.t('notice.estimationCompleted', 'Project estimate total is {estimate}.', {
        estimate: this.formatEstimate(this.completedTotal()),
      }));
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
    if (participant.presence !== 'connected') {
      return presenceLabel;
    }

    if (this.votesRevealed() && participant.estimate !== null) {
      return this.i18n.t('vote.points', '{estimate} points', { estimate: participant.estimate });
    }

    return participant.hasVoted ? this.i18n.t('vote.voted', 'Voted') : this.i18n.t('vote.thinking', 'Thinking');
  }

  participantVoteLabel(participant: ParticipantVoteRow): string {
    if (this.votesRevealed() && participant.estimate !== null) {
      return participant.estimate;
    }

    if (participant.participantId === this.activeRoom()?.localParticipantId && participant.estimate !== null) {
      return participant.estimate;
    }

    return participant.hasVoted ? this.i18n.t('vote.hidden', 'Hidden') : '—';
  }

  presenceLabel(presence: ParticipantPresence): string {
    if (presence === 'reconnecting') {
      return this.i18n.t('presence.reconnecting', 'Reconnecting');
    }

    if (presence === 'disconnected') {
      return this.i18n.t('presence.disconnected', 'Disconnected');
    }

    if (presence === 'left') {
      return this.i18n.t('presence.left', 'Left');
    }

    return this.i18n.t('presence.here', 'Here');
  }

  taskStatusLabel(task: PlanningTask): string {
    if (task.status === 'estimated') {
      return this.i18n.t('taskStatus.estimated', 'Estimated');
    }

    if (task.status === 'estimating') {
      return task.finalEstimate ? this.i18n.t('taskStatus.revote', 'Re-vote') : this.i18n.t('taskStatus.inRound', 'In round');
    }

    return this.i18n.t('taskStatus.ready', 'Ready');
  }

  formatEstimate(value: number | null | undefined): string {
    return formatAppEstimate(value, this.activeLocale(), this.i18n.t('estimate.open', 'Open'));
  }

  taskReference(index: number): string {
    return this.i18n.t('task.reference', 'Task {taskNumber}', { taskNumber: index + 1 });
  }

  participantTone(participant: ParticipantVoteRow, index: number): string {
    if (participant.participantId === this.activeRoom()?.localParticipantId) {
      return 'tone-you';
    }

    if (participant.role === 'facilitator') {
      return 'tone-facilitator';
    }

    return `tone-${index % 5}`;
  }

  cardAssistLabel(card: EstimateValue): string {
    if (card === '?') {
      return this.i18n.t('vote.unknownEstimate', 'Unknown');
    }

    if (card === '0') {
      return this.i18n.t('vote.zeroEstimate', 'Zero');
    }

    return card;
  }

  hasActiveRound(): boolean {
    return this.session.activeRound() !== null;
  }

  private async resumeFromRoute(roomCode: string): Promise<void> {
    const resumed = await this.room.resumeRoom(roomCode);
    if (resumed) {
      this.displayName.set(this.identity.displayName());
      this.notice.set(() => this.i18n.t('notice.rejoined', 'Rejoined {roomCode}.', { roomCode }));
      this.focusSoon('active-task-title');
      return;
    }

    this.roomMode.set('join');
    this.setupError.set(() => this.i18n.t('error.resumeFailed', 'We could not resume that room. Enter your name to join again.'));
    this.focusSoon('display-name-join');
  }

  private async navigateToActiveRoom(): Promise<void> {
    const roomCode = this.activeRoom()?.roomCode;
    if (roomCode) {
      await this.router.navigate([localizedPathFor(this.activeLocale(), `/rooms/${roomCode.toLowerCase()}`)], { replaceUrl: true });
    }
  }

  private localizedRoomAnnouncement(): LocalizedText {
    if (this.room.inviteCopied()) {
      return () => this.i18n.t('notice.inviteCopied', 'Room link copied.');
    }

    const code = this.activeRoom()?.roomCode ?? '';
    return () => this.i18n.t('notice.shareCode', 'Share code {roomCode}.', { roomCode: code });
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
