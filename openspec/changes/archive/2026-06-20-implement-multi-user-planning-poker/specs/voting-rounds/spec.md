## ADDED Requirements

### Requirement: RoomSession Maintains an Active PlanningRound
The system SHALL maintain at most one active PlanningRound for the current Task in a RoomSession, with a stable round id, task id, status, timestamps, and ParticipantVote collection owned by the backend.

#### Scenario: Current task starts a voting round
- **WHEN** a facilitator selects an unestimated Task that has no open PlanningRound
- **THEN** the system creates a PlanningRound for that Task with status `voting`, a stable round id, no ParticipantVote values, and the shared EstimateCard deck available to connected Participants

#### Scenario: Existing open round is resumed
- **WHEN** a facilitator selects a Task that already has an open PlanningRound
- **THEN** the system resumes that PlanningRound instead of creating a duplicate round for the same Task

#### Scenario: Stale round command is submitted
- **WHEN** a Participant submits a voting, reveal, reset, or finalization command with a round id that is not the active PlanningRound for the selected Task
- **THEN** the system rejects the command, keeps the authoritative PlanningRound unchanged, and returns a concise stale-round error

#### Scenario: No task is selected
- **WHEN** the RoomSession has no current Task
- **THEN** the system shows no active PlanningRound, disables EstimateCard voting controls, and preserves any existing Task list and saved FinalEstimate state

### Requirement: Participants Cast Private EstimateCard Votes
The system SHALL allow each connected Participant in the RoomSession to create or replace their own ParticipantVote for the active voting PlanningRound until votes are revealed.

#### Scenario: Participant casts a vote
- **WHEN** a Participant selects an EstimateCard for the active PlanningRound before reveal
- **THEN** the system stores one ParticipantVote for that Participant and broadcasts an updated RoomSession snapshot that marks the Participant as voted

#### Scenario: Participant changes a vote before reveal
- **WHEN** a Participant with an existing ParticipantVote selects a different EstimateCard before reveal
- **THEN** the system replaces that ParticipantVote with the new EstimateCard and keeps only the latest vote for that Participant in the active PlanningRound

#### Scenario: Non-member attempts to vote
- **WHEN** a command attempts to cast a ParticipantVote for a Participant that is not a member of the RoomSession
- **THEN** the system rejects the command and leaves the PlanningRound, vote progress, and saved FinalEstimate state unchanged

#### Scenario: Participant attempts to vote after reveal
- **WHEN** a Participant selects an EstimateCard after the PlanningRound status is `revealed`
- **THEN** the system rejects the vote until the facilitator starts a new PlanningRound or resets the round for re-voting

### Requirement: Vote Progress Synchronizes Without Revealing Values
The system SHALL synchronize ParticipantVote progress to every connected client while keeping hidden EstimateCard values private until the PlanningRound is revealed.

#### Scenario: Vote progress updates for all participants
- **WHEN** any Participant casts or changes a ParticipantVote before reveal
- **THEN** every connected client sees that Participant's voted state and the total voting progress without seeing that Participant's EstimateCard value

#### Scenario: Local participant sees their own vote
- **WHEN** a Participant has cast a ParticipantVote before reveal
- **THEN** that Participant's client shows their selected EstimateCard while other clients receive only that the Participant has voted

#### Scenario: Participant refreshes before reveal
- **WHEN** a Participant refreshes or reconnects before the PlanningRound is revealed
- **THEN** the recovered RoomSession snapshot restores their own selected EstimateCard and keeps other Participants' EstimateCard values hidden

#### Scenario: New participant joins before reveal
- **WHEN** a new Participant joins a RoomSession with an active unrevealed PlanningRound
- **THEN** the new Participant sees current vote progress and Participant presence without seeing any hidden EstimateCard values

### Requirement: Facilitator Reveals Votes and Computed Average
The system SHALL allow only the facilitator to reveal the active PlanningRound, expose ParticipantVote EstimateCard values to the RoomSession, and compute the average numeric estimate for the Task.

#### Scenario: Facilitator reveals votes
- **WHEN** the facilitator activates reveal for the active PlanningRound
- **THEN** the system changes the PlanningRound status to `revealed`, sets the reveal timestamp, exposes every submitted ParticipantVote value, and broadcasts the revealed RoomSession snapshot to all Participants

#### Scenario: Participant attempts to reveal votes
- **WHEN** a non-facilitator Participant activates reveal for the active PlanningRound
- **THEN** the system rejects the command, keeps EstimateCard values hidden, and leaves the PlanningRound status as `voting`

#### Scenario: Computed estimate uses average numeric vote
- **WHEN** the PlanningRound is revealed with one or more numeric EstimateCard votes
- **THEN** the system computes the Task estimate as the arithmetic average of all revealed numeric EstimateCard votes and ignores `?` votes

#### Scenario: Revealed votes are all discussion signals
- **WHEN** the PlanningRound is revealed and every ParticipantVote is `?`
- **THEN** the system shows no computable FinalEstimate and requires another PlanningRound with at least one numeric vote before the Task can be closed

### Requirement: Facilitator Resets or Starts New PlanningRounds
The system SHALL allow only the facilitator to reset voting or start a new PlanningRound, closing the previous round attempt and clearing prior ParticipantVote selections for the new attempt.

#### Scenario: Facilitator resets after discussion
- **WHEN** the facilitator starts a re-vote for the current Task after a PlanningRound has been revealed
- **THEN** the system closes the revealed PlanningRound, creates a new PlanningRound with a new round id for the same Task, clears visible ParticipantVote selections, and returns the round status to `voting`

#### Scenario: Facilitator starts next round for another task
- **WHEN** the facilitator starts the next PlanningRound for a different selected Task
- **THEN** the system closes any previous active PlanningRound, selects the requested Task, and creates or resumes the PlanningRound associated with that Task

#### Scenario: Non-facilitator attempts to reset voting
- **WHEN** a non-facilitator Participant activates reset or next-round controls
- **THEN** the system rejects the command and preserves the current PlanningRound, ParticipantVote progress, and revealed state

#### Scenario: Old votes do not carry forward
- **WHEN** a new PlanningRound is created after reset or next-round flow
- **THEN** no ParticipantVote from a previous PlanningRound is counted as a vote in the new PlanningRound

### Requirement: Voting Controls Are Accessible and State Aware
The system SHALL provide keyboard-accessible EstimateCard voting, reveal, reset, and voting-status controls with visible focus states, concise feedback, and polite announcements for meaningful PlanningRound changes.

#### Scenario: Keyboard participant casts a vote
- **WHEN** a Participant navigates EstimateCard controls by keyboard and activates a card
- **THEN** the selected EstimateCard receives visible selected state, the vote command is submitted, focus remains predictable, and the Participant receives concise confirmation when the vote is saved

#### Scenario: Reveal changes room state
- **WHEN** the PlanningRound changes from `voting` to `revealed`
- **THEN** the system announces that votes were revealed, keeps revealed ParticipantVote values readable, and moves focus only when needed to avoid leaving the user on a disabled control

#### Scenario: Command is pending or rejected
- **WHEN** a voting, reveal, reset, or next-round command is pending or fails
- **THEN** the system prevents duplicate submissions for that command, preserves the current RoomSession display, and shows a concise retryable error without overlapping EstimateCard or ParticipantVote content

#### Scenario: Voting UI is used on a narrow screen
- **WHEN** EstimateCard labels, Participant names, vote-progress labels, reveal actions, or reset actions are shown on a mobile-width viewport
- **THEN** text remains readable, controls retain usable target size, and content does not overlap or overflow its container
