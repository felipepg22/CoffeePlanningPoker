## Why

Rooms currently cover entry, membership, presence, invitations, and recovery, but a created or joined room is not yet a complete multi-user planning poker session. Teams need the active room to support the core estimation loop: choose a task, vote privately, reveal together, discuss, and save the final estimate without losing state across refresh or reconnect.

## What Changes

- Add room-scoped planning poker rounds for connected participants, including estimate card selection, private vote state before reveal, vote progress, reveal, reset, and next-round flow.
- Add task estimation inside the active room, including adding tasks, selecting the current task, associating votes with that task, and saving a final estimate.
- Synchronize task, voting, reveal, and final-estimate state for all participants in the same RoomSession through backend-owned realtime state.
- Preserve recoverable planning poker state after refresh or reconnect by resuming from authoritative room snapshots rather than local-only state.
- Update the first active-room workflow so users who create or join a room can immediately run a focused planning poker session.
- Non-goals: user accounts, cross-room administration, long-term reporting dashboards, custom card decks, integrations with external backlog tools, and chat/threaded discussion.

## Capabilities

### New Capabilities

- `voting-rounds`: Defines room-scoped PlanningRound behavior, ParticipantVote lifecycle, estimate card voting, reveal/reset/new-round transitions, and synchronized voting state.
- `task-estimation`: Defines room-scoped task management, current task selection, final estimate saving, and how estimates relate to completed voting rounds.

### Modified Capabilities

- `room-collaboration`: Room snapshots, refresh recovery, and reconnect recovery must include the active planning poker session state needed by participants who create, join, refresh, or reconnect to a room.

## Impact

- Angular first-screen and active-room UI for created and joined rooms.
- Feature areas: `rooms`, `session`, `tasks`, and supporting `identity` usage for participant-specific voting state.
- ASP.NET Core API and SignalR hub contracts for room-scoped task, vote, reveal, round, final-estimate, snapshot, and recovery events.
- Client services that isolate backend, realtime, and persistence boundaries behind replaceable Angular services.
- Focused tests for voting transitions, task-estimation rules, room snapshot recovery, realtime synchronization, and important component interactions.
