export const ESTIMATE_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '?'] as const;

export type EstimateValue = (typeof ESTIMATE_CARDS)[number];
export type PlanningRoundStatus = 'voting' | 'revealed' | 'closed';

export interface ParticipantVote {
  participantId: string;
  hasVoted: boolean;
  estimate: EstimateValue | null;
  votedAt: string | null;
}

export interface PlanningRound {
  roundId: string;
  taskId: string;
  status: PlanningRoundStatus;
  createdAt: string;
  revealedAt: string | null;
  closedAt: string | null;
  votes: readonly ParticipantVote[];
  computedAverage: number | null;
}

export type SessionPendingAction =
  | 'castVote'
  | 'revealVotes'
  | 'resetRound'
  | 'startNextRound'
  | null;
