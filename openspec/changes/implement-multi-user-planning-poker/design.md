## Context

The app already has a usable first-screen room workflow backed by Angular feature services and an ASP.NET Core SignalR room hub. Room creation, joining, invite links, membership, presence, and refresh recovery are modeled in the `rooms` feature. The active-room planning poker surface still keeps tasks, selected votes, reveal state, computed estimates, and saved estimates as local component signals in `RoomWorkflowComponent`, so a second browser, refresh, or reconnect cannot see the same round state.

This change turns the active room into a real multi-user planning poker session. The backend must own room-scoped tasks, current task selection, active planning round, participant votes, reveal state, and final estimates. The Angular app should consume that authoritative snapshot through replaceable services, keep user interactions fast with signals, and preserve the current focused coffee-room UI without adding a marketing page or broad state-management dependency.

## Goals / Non-Goals

**Goals:**

- Add explicit domain models for `PlanningTask`, `PlanningRound`, `EstimateCard`, `ParticipantVote`, and saved final estimates.
- Synchronize task queue, current task, votes, reveal state, round reset, next-round state, and final estimates for all participants in the same room.
- Keep votes private until reveal while still showing voting progress.
- Recover active planning poker state after refresh or reconnect from backend room snapshots.
- Show the total project estimate when the room reaches the end of the estimation workflow.
- Keep `rooms` responsible for room identity, membership, presence, connection, and recovery, while `session` owns voting rounds and `tasks` owns backlog estimate state.
- Keep backend, realtime, and browser persistence behind replaceable Angular service boundaries.
- Add focused deterministic tests for voting transitions, task rules, room snapshot recovery, realtime events, and important UI interactions.

**Non-Goals:**

- User accounts, authentication, cross-room administration, reporting dashboards, or long-term analytics.
- Custom card decks, external backlog integrations, chat, threaded discussion, or facilitator permission management beyond the existing facilitator role.
- Offline conflict resolution or local-first task/vote storage.
- Replacing SignalR, adding a broad client state library, or introducing a database in this change.

## Decisions

### 1. Extend `RoomSnapshot` into an authoritative room-session snapshot

Backend `RoomSnapshotDto` and frontend `RoomSnapshot` will include a nullable planning session payload with the task queue, selected task id, active round, participant vote summaries, reveal state, and saved estimates. Commands that mutate tasks or rounds return an updated snapshot and broadcast a `RoomSnapshot` event to the room group.

Rationale: snapshots are already the recovery mechanism for membership. Extending that contract gives refresh, reconnect, join, and resume one authoritative state shape instead of merging separate local sources. It also keeps browser storage limited to recovery anchors; tasks and votes are never treated as local truth.

Alternative considered: add only delta events for task and vote mutations. Delta events are efficient, but recovery and late joins would still need a full state payload. Starting snapshot-first keeps correctness simple; targeted delta events can be added later if traffic becomes a real issue.

### 2. Keep feature ownership split across `rooms`, `session`, and `tasks`

`rooms` remains the owner for room lifecycle, membership, presence, connection state, invite links, resume tokens, and recovery anchors. New `session` code owns estimate cards, participant vote lifecycle, reveal/reset/new-round transitions, and round-derived state such as vote counts and computed average estimates. New `tasks` code owns task creation, current-task selection, task status, and saved final estimate state.

Expected client placement:

- `src/app/session/models/planning-round.ts` for `EstimateCard`, `ParticipantVote`, `PlanningRound`, round status, and round commands.
- `src/app/session/services/session.service.ts` as the component-facing voting facade with signals derived from room snapshots.
- `src/app/tasks/models/planning-task.ts` for task and final estimate types.
- `src/app/tasks/services/task.service.ts` for task commands and current task derivations.
- Shared UI only when controls are reused by more than one feature, such as estimate-card buttons or compact status chips.

Rationale: the current local mock state mixes task rules, vote rules, and room membership in one component. Splitting ownership keeps planning poker rules close to the feature that owns them while still letting the active-room component compose a single workflow.

Alternative considered: create one large `RoomSessionService` that owns rooms, tasks, and voting. That reduces service count, but it makes the existing room collaboration boundary more volatile and encourages unrelated room, task, and vote rules to change together.

### 3. Add explicit backend commands for task and round mutations

The SignalR hub will add room-scoped methods for the planning poker loop:

- `AddTask(roomCode, participantId, title, details)`
- `SelectTask(roomCode, participantId, taskId)`
- `CastVote(roomCode, participantId, roundId, estimate)`
- `RevealVotes(roomCode, participantId, roundId)`
- `ResetRound(roomCode, participantId, taskId)`
- `StartNextRound(roomCode, participantId, taskId?)`
- `SaveFinalEstimate(roomCode, participantId, taskId, roundId)`

Each command validates room membership and current round state in `InMemoryRoomStore`, updates `LastActivityAt`, and returns a command result with the latest snapshot or a concise room/session error. The existing `RoomGateway` can either grow these methods or be wrapped by narrower `SessionGateway` and `TaskGateway` abstractions that still use the same SignalR connection.

Only the room creator, represented by the existing `facilitator` role in this version, can run facilitation actions: task selection, reveal, reset/re-vote, next round, and final-estimate saving. The backend must enforce this on the corresponding commands, and the frontend should disable or hide those actions for non-facilitator participants while still letting them vote and see progress.

Rationale: commands make domain transitions testable and keep the client from inventing shared state. Including `participantId`, `taskId`, and `roundId` in commands lets the backend reject stale actions after another participant changes tasks, reveals, resets, or starts a new round.

Alternative considered: have clients send arbitrary patched session state. That would be less code initially but would make validation, stale updates, vote privacy, and reconnect behavior fragile.

### 4. Store votes as private values with public progress before reveal

The backend will store one `ParticipantVote` per participant per active round. Before reveal, snapshots sent to clients expose only whether each participant has voted and the local participant's own selected estimate. After reveal, snapshots expose the revealed estimates for the round. A participant can change their own vote until reveal; after reveal, `CastVote` is rejected unless a new or reset round is started.

Rationale: planning poker depends on hidden votes until reveal, but the room still needs progress visibility. The backend can enforce privacy consistently across browsers, refreshes, and reconnects.

Alternative considered: send all votes to every client and hide them in the UI. That is not actually private and would leak estimates through browser dev tools or stale client state.

### 5. Represent rounds as immutable attempts linked to a current task

Each `PlanningRound` has a stable `roundId`, `taskId`, status (`voting`, `revealed`, or `closed`), creation timestamp, optional reveal timestamp, and participant votes. Selecting a task with no open round creates or resumes a voting round for that task. Resetting or re-voting starts a new `roundId` for the same task and closes the previous one. Saving a final estimate closes the current round and marks the task estimated; a later facilitator-triggered re-vote can create a new round for the same task and replace the saved estimate with a newer final estimate.

Rationale: immutable round ids make stale command rejection straightforward and preserve an auditable relationship between the votes that were revealed and the estimate saved for a task. The UI can still present only the current round, keeping the workflow compact.

Alternative considered: mutate one persistent round object per task. That is simpler but makes refresh/reconnect edge cases harder to reason about when a user casts a vote from an old client state.

### 6. Compute each task estimate from the average vote

The backend will compute the task FinalEstimate after reveal using the arithmetic average of all revealed numeric EstimateCard votes for that PlanningRound. `?` is a discussion signal and is excluded from the average. If all revealed votes are `?`, the task has no computable FinalEstimate and cannot be closed until the room produces a numeric vote through another PlanningRound. The facilitator can save only the backend-computed average after reveal; clients cannot submit an arbitrary task estimate or override the average.

Rationale: task estimates must represent the team's average estimation, not a sum of votes and not a facilitator-selected override. Computing the average on the backend avoids clients disagreeing after reconnect and keeps the saved FinalEstimate tied to the revealed ParticipantVotes.

Alternative considered: save a facilitator-selected value after discussion. That is flexible, but it would allow the saved task estimate to diverge from the team's actual estimates.

### 7. Compose the active-room UI from service state, not local mock arrays

`RoomWorkflowComponent` should stop owning `tasks`, `activeTaskId`, `selectedEstimate`, `votesRevealed`, `finalEstimate`, and syncing timers as local source-of-truth state. It should read current task, participant vote rows, voting progress, reveal state, computed average estimate, and command pending/error state from `session` and `tasks` services. Component methods should delegate to service commands and focus only on form input, focus movement, and concise announcements.

Rationale: moving source-of-truth state out of the component makes multi-client behavior possible and gives domain rules a testable home. Signals still keep the template simple and responsive.

Alternative considered: keep optimistic local state and reconcile later. That would feel fast, but it risks showing votes or saved estimates that the backend rejects. This live-session workflow benefits more from predictable authoritative state than speculative UI.

### 8. Preserve recovery with minimal local persistence

Browser storage remains limited to the existing room recovery anchor: room code, participant id, display name, resume token, and last joined timestamp. On create, join, or resume, the backend snapshot repopulates membership, tasks, current round, votes, reveal state, and estimates. If resume fails, the app returns to the join flow with the room code retained.

Room state expires after 2 hours of room duration for the first version. The in-memory backend should also retain only the last 5 completed rounds per room to preserve memory. When retention would discard an older completed round, the backend must first roll its saved numeric final estimate into a room-level archived estimate total. The UI can then show total project complexity as the archived estimate total plus the visible saved task estimates, preserving the overall estimate while keeping detailed round history bounded. This aggregate must not mutate newer task estimates; it is a separate summary value for older completed work.

Rationale: recovery state must be predictable after refresh without turning local storage into a stale room database. This also keeps privacy exposure lower on shared machines.

Alternative considered: persist the task queue and local vote in browser storage for faster repaint after refresh. That creates stale or misleading state and does not help other participants.

### 9. Show total project estimate at completion

The facilitator can end the estimation workflow for the room once the team is done estimating the project. The backend should mark the room session as completed and include a total estimate in the snapshot. Each task FinalEstimate is the average of that task's revealed numeric estimates; the project total is the room-level archived estimate total plus the sum of every currently visible task with a saved numeric FinalEstimate. Unestimated tasks and `?` discussion votes are excluded from the total. All participants should see the completed state and total estimate after the facilitator ends estimation.

Rationale: teams need a clear final project estimate, not only per-task results. Computing the total on the backend keeps refresh, reconnect, and all connected clients consistent.

Alternative considered: calculate and show totals only in the frontend. That is simpler, but risks inconsistent totals across clients and after older rounds are rolled into the archived total.

### 10. Keep accessibility and responsive behavior tied to live-session state

The active-room surface should continue using semantic forms, buttons, grouped estimate cards, polite live regions, visible focus states, and responsive layouts that keep room codes, participant names, task titles, and action labels from overflowing. Meaningful state changes should be announced: task selected, vote saved, votes revealed, estimate saved, connection lost, and reconnect complete. Vote progress should remain readable without exposing hidden vote values.

Rationale: the app is used during live meetings, often while screen sharing. Clear state and keyboard operation matter as much as realtime correctness.

Alternative considered: add a separate wizard or instruction-heavy view for voting. That would slow repeated sessions and conflict with the product direction to keep copy concise and task-focused.

### 11. Test domain transitions below the browser layer first

Backend tests should cover task creation, current-task selection, voting, vote replacement before reveal, reveal privacy, stale `roundId` rejection, reset/new-round behavior, final-estimate saving, archived estimate total rollover, project-completion totals, refresh/resume snapshots, and participant disconnect/reconnect preservation. Frontend service tests should use fake gateway events and snapshots to verify signal derivations and command handling. Component tests should cover the high-value interactions: adding/selecting a task, casting/changing a vote, reveal state, saving an estimate, completed total display, reconnect recovery, and mobile-safe labels where practical.

Rationale: most risk is in shared state transitions, not CSS or socket timing. Deterministic store and service tests give better coverage than timer-heavy browser tests.

Alternative considered: rely mainly on end-to-end multi-browser testing. That should exist later for confidence, but it is too slow and timing-sensitive as the primary safety net.

## Risks / Trade-offs

- [Room snapshots grow as tasks and rounds accumulate] -> Keep snapshots limited to current task queue and current/recent round data, retain only the last 5 completed rounds per room, and roll pruned numeric estimates into an archived estimate total.
- [Vote privacy can be broken by careless serialization] -> Add backend tests for pre-reveal snapshots and keep private vote values out of public DTOs until reveal.
- [Stale clients can submit commands against old rounds] -> Require `roundId` and `taskId` in mutation commands and reject mismatches with actionable errors.
- [Service boundaries can become fragmented] -> Keep `rooms` as the source of snapshots and expose narrow derived services only where task or round rules need independent tests.
- [In-memory backend state disappears on API restart or after the 2-hour room duration] -> Treat persistence beyond process memory as out of scope and keep recovery errors concise when rooms expire.
- [SignalR command growth can couple frontend to hub names] -> Keep command invocation behind gateway abstractions so a REST or different realtime backend can replace it later.
- [Accessible announcements can become noisy during voting] -> Announce local user actions and major room transitions, but avoid live-region output for every participant progress update.

## Migration Plan

1. Add shared TypeScript and C# domain types for tasks, estimate cards, votes, planning rounds, final estimates, creator-only facilitator checks, 2-hour room duration, last-5-round retention, archived estimate totals, project-completion totals, and session errors.
2. Extend backend room state and snapshot DTOs with task queue and active round state while preserving existing room membership fields.
3. Add backend command methods and store tests for task and voting transitions before wiring the UI.
4. Extend the Angular gateway boundary with task/session commands and snapshot events.
5. Add `session` and `tasks` services that derive signal state from room snapshots and expose command methods.
6. Replace local mock task/vote signals in `RoomWorkflowComponent` with service state and command calls.
7. Update active-room UI states for pending commands, command errors, hidden votes, reveal, reset, next round, saved estimates, and completed total estimate display.
8. Add focused frontend service and component tests for the core workflow.
9. Run formatting, linting, unit tests, API tests, and build checks.
10. Verify the active-room flow in a browser at desktop and mobile widths with at least two clients where practical.

Rollback is straightforward while the backend remains in-memory: remove the new task/session fields from snapshots, stop registering the new hub commands, and return the component to local-only task/vote state. Existing room recovery anchors can be kept because they do not include task or vote data.

## Open Questions

None.
