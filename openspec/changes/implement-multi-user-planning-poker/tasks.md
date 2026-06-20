## 1. Backend Session Model and Snapshots

- [x] 1.1 Add C# domain records/classes for estimate cards, planning tasks, participant votes, planning rounds, final estimates, archived estimate totals, and room estimation status.
- [x] 1.2 Extend the in-memory room state with task queue, current task id, active planning round, retained completed rounds, archived estimate total, and completed total project estimate.
- [x] 1.3 Extend room snapshot DTOs so create, join, resume, heartbeat, and realtime snapshot flows include backend-owned planning state.
- [x] 1.4 Add snapshot ordering data so clients can reject stale room/session snapshots after newer task or estimate updates.
- [x] 1.5 Serialize pre-reveal snapshots so each client sees participant vote progress and only the local participant's own hidden estimate value.

## 2. Backend Commands and Domain Rules

- [x] 2.1 Add store and SignalR hub commands for adding tasks, selecting tasks, casting votes, revealing votes, resetting or starting rounds, saving final estimates, and completing estimation.
- [x] 2.2 Enforce room membership, facilitator-only commands, task existence, active round id, round status, and stale-command validation for every task and round mutation.
- [x] 2.3 Compute final estimates on the backend as the arithmetic average of revealed numeric votes, excluding `?`, allowing fractional averages, and rejecting rounds with no numeric votes.
- [x] 2.4 Reject client-submitted arbitrary final estimate values and save only the backend-computed average linked to the revealed planning round.
- [x] 2.5 Implement re-vote behavior by closing the previous round, creating a new round id for the same task, clearing prior votes, and preserving the previous saved estimate until a newer one is saved.
- [x] 2.6 Implement completed-round retention with a five-round detail limit and roll pruned numeric final estimates into the archived estimate total.
- [x] 2.7 Ensure room duration is two hours for this feature and that planning state expires with the room.
- [x] 2.8 Mark estimation complete from a facilitator command and compute the total as archived estimate total plus visible saved numeric task estimates.

## 3. Backend Tests

- [x] 3.1 Add API store tests for task creation, invalid task titles, current task selection, missing task rejection, and facilitator-only task selection.
- [x] 3.2 Add API store tests for vote casting, vote replacement before reveal, non-member vote rejection, post-reveal vote rejection, and stale round id rejection.
- [x] 3.3 Add API store tests for pre-reveal vote privacy, local participant vote visibility, revealed vote snapshots, and new participant or refreshed participant snapshots.
- [x] 3.4 Add API store tests for reveal, average final estimate saving, fractional averages, `?` exclusion, all-`?` rejection, and arbitrary estimate rejection.
- [x] 3.5 Add API store tests for reset or next-round behavior, re-vote replacement of saved estimates, retention rollover, archived estimate totals, room completion totals, and reconnect recovery.

## 4. Frontend Models, Gateway, and Services

- [x] 4.1 Add explicit TypeScript models for estimate cards, planning tasks, participant votes, planning rounds, final estimates, room planning snapshots, and session command errors.
- [x] 4.2 Extend the room gateway boundary and SignalR implementation with task and session command methods while keeping the rest of the app behind replaceable services.
- [x] 4.3 Update `RoomService` to apply planning snapshot data, preserve recovery anchors as the only local persisted room data, and ignore stale snapshots by ordering metadata.
- [x] 4.4 Add `session` feature services that derive voting state, vote progress, revealed values, computed averages, facilitator permissions, pending commands, and errors from room snapshots.
- [x] 4.5 Add `tasks` feature services that derive task list, current task, saved estimates, archived totals, completion state, and task command state from room snapshots.
- [x] 4.6 Ensure command failures preserve the latest authoritative snapshot and expose concise retryable errors for task, vote, reveal, reset, final-estimate, and completion actions.

## 5. Active-Room UI Integration

- [x] 5.1 Replace local mock task, selected estimate, reveal, final estimate, and participant vote state in `RoomWorkflowComponent` with `session` and `tasks` service signals.
- [x] 5.2 Wire task creation, task selection, vote casting, vote changing, reveal, reset or re-vote, final estimate saving, next-task flow, and completion controls to service commands.
- [x] 5.3 Disable or hide facilitator-only actions for non-facilitator participants while leaving voting, progress, revealed results, saved estimates, and completion totals visible.
- [x] 5.4 Update active-room templates to show hidden vote progress before reveal, revealed vote values after reveal, no-computable-estimate state for all-`?` rounds, and fractional averages.
- [x] 5.5 Show saved task estimates, re-vote-in-progress state, archived-total-aware completed project total, disconnected or reconnecting state, and concise command errors without losing current inputs.
- [x] 5.6 Preserve keyboard operation, visible focus states, polite announcements, and mobile-safe layouts for task controls, estimate cards, reveal/reset controls, save estimate flow, and completion total display.

## 6. Frontend Tests and Verification

- [x] 6.1 Add frontend service tests for planning snapshot derivations, stale snapshot rejection, command pending/error state, hidden vote visibility, reveal state, saved estimates, archived totals, and completion totals.
- [x] 6.2 Add component tests for adding and selecting tasks, casting and changing votes, facilitator-only reveal/reset/save actions, all-`?` save rejection, completed total display, and reconnect recovery display.
- [x] 6.3 Run `npm run test` and `npm run test:api` after implementation.
- [x] 6.4 Run `npm run build` after implementation.
- [x] 6.5 Verify the active room workflow in a browser with at least two clients at desktop and mobile widths, including refresh/reconnect, pre-reveal vote privacy, reveal, save estimate, re-vote, and completion total.
