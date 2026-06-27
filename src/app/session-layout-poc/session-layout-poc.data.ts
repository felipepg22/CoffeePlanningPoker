import { computed, signal } from '@angular/core';

export const ESTIMATE_CARDS = ['1/2', '1', '2', '3', '5', '8', '13', '21', '?'] as const;

export type EstimateCard = (typeof ESTIMATE_CARDS)[number];
export type PresenceState = 'online' | 'reconnecting';
export type TaskStatus = 'ready' | 'estimating' | 'estimated';

export interface PocParticipant {
  id: string;
  name: string;
  role: 'Facilitator' | 'Developer' | 'QA Engineer' | 'Designer' | 'Product Owner';
  initials: string;
  estimate: EstimateCard | null;
  hasVoted: boolean;
  presence: PresenceState;
  tone: 'coral' | 'blue' | 'green' | 'violet' | 'amber' | 'slate';
}

export interface PocTask {
  id: string;
  code: string;
  title: string;
  details: string;
  status: TaskStatus;
  estimate: number | null;
  progress: string;
}

const BASE_PARTICIPANTS: PocParticipant[] = [
  {
    id: 'you',
    name: 'You',
    role: 'Facilitator',
    initials: 'YO',
    estimate: '8',
    hasVoted: true,
    presence: 'online',
    tone: 'coral',
  },
  {
    id: 'alice',
    name: 'Alice',
    role: 'Developer',
    initials: 'AL',
    estimate: '5',
    hasVoted: true,
    presence: 'online',
    tone: 'blue',
  },
  {
    id: 'ben',
    name: 'Ben',
    role: 'Developer',
    initials: 'BE',
    estimate: '8',
    hasVoted: true,
    presence: 'online',
    tone: 'green',
  },
  {
    id: 'carla',
    name: 'Carla',
    role: 'QA Engineer',
    initials: 'CA',
    estimate: '8',
    hasVoted: true,
    presence: 'online',
    tone: 'violet',
  },
  {
    id: 'devon',
    name: 'Devon',
    role: 'Designer',
    initials: 'DE',
    estimate: '13',
    hasVoted: true,
    presence: 'online',
    tone: 'amber',
  },
  {
    id: 'riley',
    name: 'Riley',
    role: 'Product Owner',
    initials: 'RI',
    estimate: null,
    hasVoted: false,
    presence: 'reconnecting',
    tone: 'slate',
  },
];

const BASE_TASKS: PocTask[] = [
  {
    id: 'brew-482',
    code: 'BREW-482',
    title: 'Estimate reconnect fallback',
    details: 'Keep the team in the same round after refresh or reconnect.',
    status: 'estimating',
    estimate: null,
    progress: '5/6',
  },
  {
    id: 'brew-483',
    code: 'BREW-483',
    title: 'Improve offline indicator',
    details: 'Make reconnecting state obvious without interrupting the round.',
    status: 'ready',
    estimate: null,
    progress: '0/6',
  },
  {
    id: 'brew-484',
    code: 'BREW-484',
    title: 'Add session timeout warning',
    details: 'Warn the facilitator before the room expires.',
    status: 'ready',
    estimate: null,
    progress: '0/6',
  },
  {
    id: 'brew-485',
    code: 'BREW-485',
    title: 'Persist draft estimates',
    details: 'Keep local card choices stable while the connection recovers.',
    status: 'estimated',
    estimate: 5,
    progress: '6/6',
  },
  {
    id: 'brew-486',
    code: 'BREW-486',
    title: 'Show last round summary',
    details: 'Show the previous average and spread before starting a re-vote.',
    status: 'ready',
    estimate: null,
    progress: '0/6',
  },
  {
    id: 'brew-487',
    code: 'BREW-487',
    title: 'Mobile layout polish',
    details: 'Tune touch targets and sticky actions for mobile sessions.',
    status: 'ready',
    estimate: null,
    progress: '0/6',
  },
  {
    id: 'brew-488',
    code: 'BREW-488',
    title: 'Refactor vote service',
    details: 'Separate round rules from transport details.',
    status: 'estimated',
    estimate: 13,
    progress: '6/6',
  },
];

export class SessionLayoutPocState {
  readonly cards = ESTIMATE_CARDS;
  readonly participants = signal<PocParticipant[]>(cloneParticipants());
  readonly tasks = signal<PocTask[]>(cloneTasks());
  readonly selectedTaskId = signal(BASE_TASKS[0].id);
  readonly selectedEstimate = signal<EstimateCard>('8');
  readonly revealed = signal(false);
  readonly notice = signal('All changes saved');

  readonly activeTask = computed(() => {
    return this.tasks().find((task) => task.id === this.selectedTaskId()) ?? this.tasks()[0];
  });

  readonly votedCount = computed(() => this.participants().filter((participant) => participant.hasVoted).length);
  readonly totalVoters = computed(() => this.participants().length);
  readonly voteProgress = computed(() => Math.round((this.votedCount() / this.totalVoters()) * 100));
  readonly averageEstimate = computed(() => averageEstimate(this.participants()));
  readonly canSave = computed(() => this.revealed() && this.averageEstimate() !== null);

  selectTask(taskId: string): void {
    this.selectedTaskId.set(taskId);
    this.revealed.set(false);
    this.selectedEstimate.set('8');
    this.participants.set(cloneParticipants());
    this.tasks.update((tasks) =>
      tasks.map((task) => ({
        ...task,
        status: task.id === taskId ? 'estimating' : task.status === 'estimating' ? 'ready' : task.status,
        progress: task.id === taskId ? '5/6' : task.progress,
      })),
    );
    this.notice.set('Task selected. Votes are hidden.');
  }

  selectEstimate(card: EstimateCard): void {
    this.selectedEstimate.set(card);
    this.participants.update((participants) =>
      participants.map((participant) =>
        participant.id === 'you'
          ? {
              ...participant,
              estimate: card,
              hasVoted: true,
            }
          : participant,
      ),
    );
    this.notice.set(`Selected ${card}. You can change it until reveal.`);
  }

  revealVotes(): void {
    this.revealed.set(true);
    this.notice.set('Votes revealed. Discuss the spread, then save the average.');
  }

  saveFinalEstimate(): void {
    const estimate = this.averageEstimate();
    if (estimate === null) {
      return;
    }

    const activeTaskId = this.selectedTaskId();
    this.tasks.update((tasks) =>
      tasks.map((task) =>
        task.id === activeTaskId
          ? {
              ...task,
              status: 'estimated',
              estimate,
              progress: '6/6',
            }
          : task,
      ),
    );
    this.notice.set(`Saved ${estimate} points for ${this.activeTask().code}.`);
  }

  startReVote(): void {
    this.revealed.set(false);
    this.participants.set(cloneParticipants());
    this.notice.set('New vote ready. Prior estimate stays until saved again.');
  }

  startNextRound(): void {
    const tasks = this.tasks();
    const activeIndex = tasks.findIndex((task) => task.id === this.selectedTaskId());
    const nextTask = tasks.slice(activeIndex + 1).find((task) => task.status !== 'estimated')
      ?? tasks.find((task) => task.status !== 'estimated')
      ?? tasks[0];

    this.selectTask(nextTask.id);
    this.notice.set(`Next round ready for ${nextTask.code}.`);
  }

  completeEstimation(): void {
    this.notice.set(`Project total: ${this.projectTotal()} points.`);
  }

  taskStatusLabel(task: PocTask): string {
    if (task.status === 'estimated') {
      return `Estimated ${task.estimate ?? '-'}`;
    }

    if (task.status === 'estimating') {
      return 'In round';
    }

    return 'Ready';
  }

  participantVoteLabel(participant: PocParticipant): string {
    if (participant.presence === 'reconnecting') {
      return 'Reconnecting';
    }

    if (this.revealed() && participant.estimate !== null) {
      return participant.estimate;
    }

    return participant.hasVoted ? 'Voted' : 'Thinking';
  }

  projectTotal(): number {
    return this.tasks().reduce((total, task) => total + (task.estimate ?? 0), 0);
  }
}

function cloneParticipants(): PocParticipant[] {
  return BASE_PARTICIPANTS.map((participant) => ({ ...participant }));
}

function cloneTasks(): PocTask[] {
  return BASE_TASKS.map((task) => ({ ...task }));
}

function averageEstimate(participants: PocParticipant[]): number | null {
  const numericVotes = participants
    .map((participant) => numericEstimate(participant.estimate))
    .filter((estimate): estimate is number => estimate !== null);

  if (numericVotes.length === 0) {
    return null;
  }

  const average = numericVotes.reduce((total, estimate) => total + estimate, 0) / numericVotes.length;
  return Math.round(average);
}

function numericEstimate(estimate: EstimateCard | null): number | null {
  if (estimate === null || estimate === '?') {
    return null;
  }

  if (estimate === '1/2') {
    return 0.5;
  }

  return Number(estimate);
}
