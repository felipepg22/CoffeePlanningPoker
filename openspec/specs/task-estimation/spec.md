# task-estimation Specification

## Purpose
TBD - created by archiving change implement-multi-user-planning-poker. Update Purpose after archive.
## Requirements
### Requirement: Participants Manage Room Tasks
The system SHALL let connected Participants add Tasks to the active RoomSession, synchronize the task list to all Participants, and keep Task state owned by the backend.

#### Scenario: Participant adds a task
- **WHEN** a connected Participant submits a Task with a valid title and optional details
- **THEN** the system adds the Task to the RoomSession task list with a stable task id, unestimated status, no FinalEstimate, and a shared snapshot visible to all connected Participants

#### Scenario: Task title is invalid
- **WHEN** a Participant submits a Task without a valid title
- **THEN** the system keeps the entered details available for correction, identifies the title problem, and does not add a Task to the RoomSession

#### Scenario: Task add command is pending
- **WHEN** a Task add command is in progress
- **THEN** the system prevents duplicate submissions from the same form and preserves the current task list until the backend-owned RoomSession snapshot confirms the change

#### Scenario: Task add command fails
- **WHEN** adding a Task fails because the room service or realtime connection is unavailable
- **THEN** the system preserves the user's Task input, leaves the backend-owned task list unchanged, and shows a concise retryable error

### Requirement: Facilitator Selects the Current Task
The system SHALL allow only the facilitator to select the current Task for estimation and SHALL synchronize that selection through the RoomSession snapshot.

#### Scenario: Facilitator selects an unestimated task
- **WHEN** the facilitator selects an unestimated Task from the RoomSession task list
- **THEN** the system marks that Task as the current Task, creates or resumes its active PlanningRound, and broadcasts the updated RoomSession snapshot to all Participants

#### Scenario: Facilitator selects an estimated task for re-vote
- **WHEN** the facilitator selects a Task that already has a saved FinalEstimate
- **THEN** the system makes that Task current without deleting the saved FinalEstimate and allows the facilitator to start a new PlanningRound for re-estimation

#### Scenario: Non-facilitator attempts task selection
- **WHEN** a non-facilitator Participant attempts to select the current Task
- **THEN** the system rejects the command, preserves the previous current Task, and keeps the Participant in the synchronized RoomSession

#### Scenario: Selected task no longer exists
- **WHEN** the facilitator attempts to select a Task id that is not in the RoomSession task list
- **THEN** the system rejects the command and keeps the existing current Task and PlanningRound unchanged

### Requirement: Facilitator Saves Average FinalEstimate After Reveal
The system SHALL allow only the facilitator to save the backend-computed average FinalEstimate for the current Task after the active PlanningRound has been revealed.

#### Scenario: Facilitator saves computed average estimate
- **WHEN** a PlanningRound is revealed with numeric EstimateCard votes `1`, `2`, and `3` and the facilitator saves the FinalEstimate
- **THEN** the system stores `2` as the FinalEstimate on the current Task, links it to the revealed PlanningRound, closes the PlanningRound, and broadcasts the updated Task state to all Participants

#### Scenario: Average estimate can be fractional
- **WHEN** a PlanningRound is revealed with numeric EstimateCard votes `1` and `2` and the facilitator saves the FinalEstimate
- **THEN** the system stores `1.5` as the FinalEstimate on the current Task and does not round it to a different EstimateCard value

#### Scenario: Discussion signals are excluded from average
- **WHEN** a PlanningRound is revealed with numeric EstimateCard votes `2` and `4` plus a `?` vote and the facilitator saves the FinalEstimate
- **THEN** the system stores `3` as the FinalEstimate on the current Task and does not count `?` as zero or as a numeric estimate

#### Scenario: Average cannot be computed
- **WHEN** the facilitator attempts to save a FinalEstimate after a revealed PlanningRound that has no numeric EstimateCard votes
- **THEN** the system rejects the command, leaves the Task unestimated, and requires another PlanningRound with at least one numeric vote

#### Scenario: Final estimate is saved before reveal
- **WHEN** any client attempts to save a FinalEstimate before the active PlanningRound is revealed
- **THEN** the system rejects the command and keeps the Task, PlanningRound, and ParticipantVote state unchanged

#### Scenario: Client submits arbitrary estimate
- **WHEN** any client attempts to save a FinalEstimate value that was not computed from the revealed ParticipantVotes
- **THEN** the system rejects the arbitrary value and preserves the backend-computed average as the only savable FinalEstimate

#### Scenario: Non-facilitator saves final estimate
- **WHEN** a non-facilitator Participant attempts to save a FinalEstimate
- **THEN** the system rejects the command and keeps the revealed PlanningRound and Task estimate state unchanged

### Requirement: Task Estimates Persist and Can Be Replaced by Re-vote
The system SHALL preserve each Task's saved FinalEstimate across snapshots, refresh, and reconnect, and SHALL replace that FinalEstimate only when a later facilitator-approved revealed PlanningRound is saved for the same Task.

#### Scenario: Participant refreshes after estimate is saved
- **WHEN** a Participant refreshes or reconnects after a Task receives a FinalEstimate
- **THEN** the recovered RoomSession snapshot shows the Task as estimated with the saved numeric FinalEstimate and the current RoomSession state

#### Scenario: Facilitator saves estimate after re-vote
- **WHEN** the facilitator starts a new PlanningRound for an already estimated Task and saves a newer numeric FinalEstimate after reveal
- **THEN** the system replaces the Task's previous FinalEstimate with the newer value and keeps the Task associated with the latest saved PlanningRound

#### Scenario: Re-vote is started but not saved
- **WHEN** a new PlanningRound is started for an estimated Task and no newer FinalEstimate has been saved
- **THEN** the system continues showing the existing FinalEstimate as the Task's saved result while the active PlanningRound remains separate

#### Scenario: Late snapshot arrives after estimate change
- **WHEN** a client receives an older RoomSession snapshot after a newer FinalEstimate has already been applied
- **THEN** the client preserves the authoritative latest snapshot order and does not replace the newer Task estimate with stale local state

### Requirement: RoomSession Completion Shows Total Project Estimate
The system SHALL allow the facilitator to complete the estimation workflow for a RoomSession and SHALL compute a total project estimate by summing saved task FinalEstimates.

#### Scenario: Facilitator completes estimation
- **WHEN** the facilitator ends estimation for the RoomSession
- **THEN** the system marks the RoomSession estimation state as completed, calculates the total as the archived estimate total plus the sum of every visible Task with a saved numeric FinalEstimate, and broadcasts the completed state to all Participants

#### Scenario: Total sums average task estimates
- **WHEN** a RoomSession has saved Task FinalEstimates `2`, `3.5`, and `5`
- **THEN** the completed total project estimate is `10.5`

#### Scenario: Total excludes unestimated tasks
- **WHEN** a RoomSession includes Tasks without a saved numeric FinalEstimate
- **THEN** the completed total excludes those Tasks and keeps them visibly unestimated

#### Scenario: Non-facilitator attempts completion
- **WHEN** a non-facilitator Participant attempts to complete estimation for the RoomSession
- **THEN** the system rejects the command and keeps the RoomSession estimation state active

#### Scenario: Participant reconnects after completion
- **WHEN** a Participant refreshes or reconnects after estimation is completed
- **THEN** the recovered RoomSession snapshot shows the completed state, visible saved Task estimates, and total project estimate

### Requirement: Completed Round Retention Preserves Aggregate Estimate
The system SHALL retain only bounded detailed completed-round history per RoomSession and SHALL preserve older numeric estimates in a room-level archived estimate total.

#### Scenario: Completed round limit is exceeded
- **WHEN** saving a FinalEstimate would exceed the RoomSession limit of five retained completed PlanningRounds
- **THEN** the system rolls the oldest pruned round's saved numeric FinalEstimate into the archived estimate total before removing its detailed round data

#### Scenario: Archived total contributes to completion total
- **WHEN** the facilitator completes estimation after older completed rounds have been archived
- **THEN** the total project estimate includes the archived estimate total plus the sum of currently visible saved Task FinalEstimates

#### Scenario: Archived total does not change visible task estimates
- **WHEN** older completed round details are pruned into the archived estimate total
- **THEN** the system does not mutate newer visible Task FinalEstimates or their linked PlanningRounds

### Requirement: Task Estimation UI Is Accessible and Responsive
The system SHALL provide keyboard-accessible Task creation, Task selection, FinalEstimate saving, and completion controls with visible focus states, concise feedback, and layouts that remain readable on desktop and mobile screens.

#### Scenario: Keyboard user adds and selects a task
- **WHEN** a user navigates Task title, details, add, task-list, and task-selection controls by keyboard
- **THEN** every control has an accessible name, visible focus state, and can be completed without pointer input

#### Scenario: Estimate save dialog opens
- **WHEN** the facilitator opens a FinalEstimate decision after reveal
- **THEN** focus moves into the focused decision UI, available numeric EstimateCard values are accessible by keyboard, and focus returns predictably after save or cancellation

#### Scenario: Task state changes are announced
- **WHEN** a Task is added, selected, estimated, re-opened for voting, or included in a completed total
- **THEN** the system announces the meaningful state change through a polite live region without announcing every passive snapshot refresh

#### Scenario: Task UI is used on a narrow screen
- **WHEN** Task titles, details, FinalEstimate values, completion totals, or action labels are shown on a mobile-width viewport
- **THEN** text remains readable and does not overlap or overflow buttons, cards, dialogs, or list items
