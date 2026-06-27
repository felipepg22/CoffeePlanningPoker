import { DOCUMENT } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
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
import { LocaleSelectorComponent } from '../../shared/i18n/locale-selector.component';
import { localizedPathFor, resolveLocale } from '../../shared/i18n/locales';
import { roomErrorMessage, validationMessage } from '../../shared/i18n/messages';
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
  validateTaskDetails,
  validateTaskTitle,
} from '../services/room-validation';

type RoomMode = 'create' | 'join';

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
  private readonly localeId = inject(LOCALE_ID);
  readonly room = inject(RoomService);
  readonly session = inject(SessionService);
  readonly taskState = inject(TaskService);
  readonly activeLocale = resolveLocale({
    pathname: globalThis.location?.pathname ?? '/',
    persistedLocale: this.identity.localePreference(),
    languages: globalThis.navigator?.languages ?? [],
  });

  readonly roomMode = signal<RoomMode>('create');
  readonly roomName = signal('');
  readonly joinCode = signal('');
  readonly displayName = signal(this.identity.displayName());
  readonly setupError = signal('');

  readonly newTaskTitle = signal('');
  readonly newTaskDetails = signal('');
  readonly taskError = signal('');
  readonly taskSearch = signal('');
  readonly participantSearch = signal('');
  readonly addTaskOpen = signal(true);
  readonly notice = signal($localize`:@@notice.entryReady:Create a room or join with a code.`);

  readonly activeRoom = this.room.activeRoom;
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
  readonly readinessLabel = computed(() => $localize`:@@round.readiness:${this.votedCount()}:votedCount: of ${this.totalVoters()}:totalVoters: voted`);
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
  readonly setupMessage = computed(() => this.setupError() || roomErrorMessage(this.room.error()) || '');
  readonly isBusy = computed(() => this.room.pendingAction() !== null);
  readonly isCommandBusy = computed(() => this.session.pendingAction() !== null || this.taskState.pendingAction() !== null);
  readonly taskMessage = computed(() => this.taskError() || roomErrorMessage(this.taskState.error()) || roomErrorMessage(this.session.error()) || '');
  readonly copyInviteLabel = computed(() => this.room.inviteCopied() ? $localize`:@@button.copied:Copied` : $localize`:@@button.copyInvite:Copy invite`);
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
      return $localize`:@@sync.notStarted:Not synced yet`;
    }

    const updated = new Date(updatedAt);
    if (Number.isNaN(updated.getTime())) {
      return $localize`:@@sync.available:Sync available`;
    }

    return $localize`:@@sync.lastSync:Last sync: ${updated.toLocaleTimeString(this.localeId, { hour: 'numeric', minute: '2-digit' })}:time:`;
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
      return $localize`:@@connection.connected:Connected`;
    }

    if (state === 'reconnecting' || state === 'connecting') {
      return $localize`:@@connection.reconnecting:Reconnecting`;
    }

    if (state === 'disconnected') {
      return $localize`:@@connection.disconnected:Disconnected`;
    }

    return $localize`:@@connection.notConnected:Not connected`;
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
          this.setupError.set($localize`:@@error.invalidInvite:That invite link is not valid.`);
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

  updateTaskSearch(event: Event): void {
    this.taskSearch.set(this.inputValue(event));
  }

  updateParticipantSearch(event: Event): void {
    this.participantSearch.set(this.inputValue(event));
  }

  toggleAddTask(): void {
    this.addTaskOpen.update((isOpen) => !isOpen);
  }

  async startRoom(event: Event, mode: RoomMode): Promise<void> {
    event.preventDefault();
    this.setupError.set('');
    this.room.clearError();

    const displayName = this.displayName().trim();
    const displayValidation = validateDisplayName(displayName);
    if (!displayValidation.valid) {
      this.setupError.set(validationMessage(displayValidation));
      this.focusSoon(mode === 'create' ? 'display-name-create' : 'display-name-join');
      return;
    }

    if (mode === 'create') {
      const roomName = this.roomName().trim();
      const roomValidation = validateRoomName(roomName);
      if (!roomValidation.valid) {
        this.setupError.set(validationMessage(roomValidation));
        this.focusSoon('room-name');
        return;
      }

      const created = await this.room.createRoom(roomName, displayName);
      if (created) {
        const activeRoom = this.activeRoom();
        this.notice.set($localize`:@@notice.roomCreated:${activeRoom?.roomCode ?? 'Room'}:roomCode: is live. Add a task to begin.`);
        await this.navigateToActiveRoom();
        this.focusSoon('task-title');
      }
      return;
    }

    const roomCode = normalizeRoomCode(this.joinCode());
    const codeValidation = validateRoomCode(roomCode);
    if (!codeValidation.valid) {
      this.setupError.set(validationMessage(codeValidation));
      this.focusSoon('join-code');
      return;
    }

    const joined = await this.room.joinRoom(roomCode, displayName);
    if (joined) {
      this.notice.set($localize`:@@notice.roomJoined:Joined ${roomCode}:roomCode:. Your vote is hidden until reveal.`);
      await this.navigateToActiveRoom();
      this.focusSoon('active-task-title');
    }
  }

  async leaveRoom(): Promise<void> {
    await this.room.leaveRoom();
    this.notice.set($localize`:@@notice.roomLeft:Left the room.`);
    await this.router.navigate([localizedPathFor(this.activeLocale, '/')]);
    this.focusSoon('room-name');
  }

  async copyRoomLink(): Promise<void> {
    await this.room.copyInviteLink();
    this.notice.set(this.localizedRoomAnnouncement());
  }

  async addTask(event: Event): Promise<void> {
    event.preventDefault();
    this.taskError.set('');
    this.taskState.clearError();

    const title = this.newTaskTitle().trim();
    const titleValidation = validateTaskTitle(title);
    if (!titleValidation.valid) {
      this.taskError.set(validationMessage(titleValidation));
      return;
    }

    const detailsValidation = validateTaskDetails(this.newTaskDetails());
    if (!detailsValidation.valid) {
      this.taskError.set(validationMessage(detailsValidation));
      return;
    }

    const added = await this.taskState.addTask(title, this.newTaskDetails());
    if (!added) {
      return;
    }

    this.newTaskTitle.set('');
    this.newTaskDetails.set('');
    this.notice.set($localize`:@@notice.taskAdded:Task added.`);

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
      this.notice.set($localize`:@@notice.taskSelected:Task selected. Votes are ready.`);
      this.focusSoon('active-task-title');
    }
  }

  async castVote(value: EstimateValue): Promise<void> {
    const voted = await this.session.castVote(value);
    if (voted) {
      this.notice.set($localize`:@@notice.voteSaved:Your ${value}:estimate: vote is saved. You can change it until reveal.`);
    }
  }

  async revealVotes(): Promise<void> {
    const revealed = await this.session.revealVotes();
    if (revealed) {
      this.notice.set(this.splitNeedsDiscussion()
        ? $localize`:@@notice.votesSplit:Votes are split. Discuss the high and low estimates first.`
        : $localize`:@@notice.votesRevealed:Votes are revealed. Save the final estimate when the team agrees.`);
    }
  }

  async saveFinalEstimate(): Promise<void> {
    const task = this.activeTask();
    const estimate = this.suggestedEstimate();
    const saved = await this.taskState.saveFinalEstimate(this.session.activeRound());
    if (saved && task) {
      this.notice.set($localize`:@@notice.finalEstimateSaved:Saved ${this.formatEstimate(estimate)} points for ${task.title}:taskTitle:.`);
    }
  }

  async startReVote(): Promise<void> {
    const task = this.activeTask();
    if (!task) {
      return;
    }

    const started = await this.session.resetRound(task.taskId);
    if (started) {
      this.notice.set($localize`:@@notice.revoteReady:New vote ready. Prior saved estimate stays until a newer one is saved.`);
    }
  }

  async startNextRound(): Promise<void> {
    const started = await this.session.startNextRound();
    if (started) {
      this.notice.set($localize`:@@notice.nextRoundReady:Next round ready. Pick a card when discussion is done.`);
      this.focusSoon('active-task-title');
    }
  }

  async completeEstimation(): Promise<void> {
    const completed = await this.taskState.completeEstimation();
    if (completed) {
      this.notice.set($localize`:@@notice.estimationCompleted:Project estimate total is ${this.formatEstimate(this.completedTotal())}:estimate:.`);
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
      return $localize`:@@vote.points:${participant.estimate}:estimate: points`;
    }

    return participant.hasVoted ? $localize`:@@vote.voted:Voted` : $localize`:@@vote.thinking:Thinking`;
  }

  participantVoteLabel(participant: ParticipantVoteRow): string {
    if (this.votesRevealed() && participant.estimate !== null) {
      return participant.estimate;
    }

    if (participant.participantId === this.activeRoom()?.localParticipantId && participant.estimate !== null) {
      return participant.estimate;
    }

    return participant.hasVoted ? $localize`:@@vote.hidden:Hidden` : '—';
  }

  presenceLabel(presence: ParticipantPresence): string {
    if (presence === 'reconnecting') {
      return $localize`:@@presence.reconnecting:Reconnecting`;
    }

    if (presence === 'disconnected') {
      return $localize`:@@presence.disconnected:Disconnected`;
    }

    if (presence === 'left') {
      return $localize`:@@presence.left:Left`;
    }

    return $localize`:@@presence.here:Here`;
  }

  taskStatusLabel(task: PlanningTask): string {
    if (task.status === 'estimated') {
      return $localize`:@@taskStatus.estimated:Estimated`;
    }

    if (task.status === 'estimating') {
      return task.finalEstimate ? $localize`:@@taskStatus.revote:Re-vote` : $localize`:@@taskStatus.inRound:In round`;
    }

    return $localize`:@@taskStatus.ready:Ready`;
  }

  formatEstimate(value: number | null | undefined): string {
    return formatAppEstimate(value, this.localeId);
  }

  taskReference(index: number): string {
    return $localize`:@@task.reference:Task ${index + 1}:taskNumber:`;
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
      return $localize`:@@vote.unknownEstimate:Unknown`;
    }

    if (card === '0') {
      return $localize`:@@vote.zeroEstimate:Zero`;
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
      this.notice.set($localize`:@@notice.rejoined:Rejoined ${roomCode}:roomCode:.`);
      this.focusSoon('active-task-title');
      return;
    }

    this.roomMode.set('join');
    this.setupError.set($localize`:@@error.resumeFailed:We could not resume that room. Enter your name to join again.`);
    this.focusSoon('display-name-join');
  }

  private async navigateToActiveRoom(): Promise<void> {
    const roomCode = this.activeRoom()?.roomCode;
    if (roomCode) {
      await this.router.navigate([localizedPathFor(this.activeLocale, `/rooms/${roomCode.toLowerCase()}`)], { replaceUrl: true });
    }
  }

  private localizedRoomAnnouncement(): string {
    if (this.room.inviteCopied()) {
      return $localize`:@@notice.inviteCopied:Room link copied.`;
    }

    const code = this.activeRoom()?.roomCode ?? '';
    return $localize`:@@notice.shareCode:Share code ${code}:roomCode:.`;
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
