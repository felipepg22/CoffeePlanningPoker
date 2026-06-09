import { Component, computed, signal } from '@angular/core';

type EstimateValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?';
type ParticipantStatus = 'voted' | 'thinking' | 'away';
type TaskStatus = 'ready' | 'estimating' | 'estimated';
type RoomMode = 'create' | 'join';
type Tone = 'blue' | 'coffee' | 'green' | 'violet' | 'slate';

interface Participant {
  id: string;
  name: string;
  role: string;
  status: ParticipantStatus;
  vote: EstimateValue | null;
  tone: Tone;
}

interface PlanningTask {
  id: string;
  title: string;
  details: string;
  estimate: EstimateValue | null;
  status: TaskStatus;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly estimateCards: readonly EstimateValue[] = ['0', '1', '2', '3', '5', '8', '13', '21', '?'];

  readonly roomMode = signal<RoomMode>('create');
  readonly roomName = signal('Sprint roast planning');
  readonly roomCode = signal('BREW-482');
  readonly joinCode = signal('');
  readonly displayName = signal('Felipe');
  readonly sessionStarted = signal(false);
  readonly setupError = signal('');

  readonly newTaskTitle = signal('');
  readonly newTaskDetails = signal('');
  readonly taskError = signal('');

  readonly activeTaskId = signal('task-checkout');
  readonly selectedEstimate = signal<EstimateValue | null>(null);
  readonly votesRevealed = signal(false);
  readonly finalEstimate = signal<EstimateValue | null>(null);
  readonly isSyncing = signal(false);
  readonly notice = signal('Room draft is ready. Create a room or join with a code.');

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

  readonly participants = signal<Participant[]>([
    {
      id: 'sam',
      name: 'Sam',
      role: 'Frontend',
      status: 'voted',
      vote: '5',
      tone: 'coffee',
    },
    {
      id: 'irene',
      name: 'Irene',
      role: 'Backend',
      status: 'voted',
      vote: '8',
      tone: 'green',
    },
    {
      id: 'mo',
      name: 'Mo',
      role: 'QA',
      status: 'thinking',
      vote: null,
      tone: 'violet',
    },
    {
      id: 'lina',
      name: 'Lina',
      role: 'Product',
      status: 'voted',
      vote: '5',
      tone: 'blue',
    },
  ]);

  readonly activeTask = computed(() => this.tasks().find((task) => task.id === this.activeTaskId()) ?? null);

  readonly currentParticipant = computed<Participant>(() => ({
    id: 'you',
    name: this.displayName().trim() || 'You',
    role: 'Facilitator',
    status: this.selectedEstimate() === null ? 'thinking' : 'voted',
    vote: this.selectedEstimate(),
    tone: 'slate',
  }));

  readonly participantRows = computed(() => [this.currentParticipant(), ...this.participants()]);
  readonly totalVoters = computed(() => this.participantRows().length);
  readonly votedCount = computed(() => this.participantRows().filter((participant) => participant.vote !== null).length);
  readonly voteProgress = computed(() => Math.round((this.votedCount() / this.totalVoters()) * 100));
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

  setRoomMode(mode: RoomMode): void {
    this.roomMode.set(mode);
    this.setupError.set('');
  }

  updateRoomName(event: Event): void {
    this.roomName.set(this.inputValue(event));
  }

  updateJoinCode(event: Event): void {
    this.joinCode.set(this.inputValue(event).toUpperCase());
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

  startRoom(event: Event, mode: RoomMode): void {
    event.preventDefault();

    const displayName = this.displayName().trim();
    if (displayName.length < 2) {
      this.setupError.set('Enter a display name with at least 2 characters.');
      return;
    }

    if (mode === 'join') {
      const code = this.joinCode().trim().toUpperCase();
      if (code.length < 4) {
        this.setupError.set('Enter the room code your facilitator shared.');
        return;
      }
      this.roomCode.set(code);
    }

    if (mode === 'create' && this.roomName().trim().length < 3) {
      this.setupError.set('Name the room so teammates know they are in the right session.');
      return;
    }

    this.sessionStarted.set(true);
    this.setupError.set('');
    this.notice.set(mode === 'create' ? `${this.roomCode()} is live. Start voting when the team is ready.` : `Joined ${this.roomCode()}. Your vote is hidden until reveal.`);
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
    this.participants.update((participants) => participants.map((participant, index) => ({
      ...participant,
      status: index === 2 ? 'away' : 'thinking',
      vote: null,
    })));
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
    this.participants.update((participants) => participants.map((participant) => ({
      ...participant,
      status: participant.status === 'away' ? 'away' : 'thinking',
      vote: null,
    })));
    this.notice.set('New round ready. Pick a card when discussion is done.');
  }

  async copyRoomLink(): Promise<void> {
    const link = `${window.location.origin}/rooms/${this.roomCode().toLowerCase()}`;

    try {
      await navigator.clipboard.writeText(link);
      this.notice.set('Room link copied.');
    } catch {
      this.notice.set(`Share code ${this.roomCode()} with your team.`);
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

  statusLabel(participant: Participant): string {
    if (this.votesRevealed() && participant.vote !== null) {
      return `${participant.vote} points`;
    }

    if (participant.status === 'away') {
      return 'Reconnecting';
    }

    return participant.vote === null ? 'Thinking' : 'Voted';
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

  private inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private textareaValue(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }
}
