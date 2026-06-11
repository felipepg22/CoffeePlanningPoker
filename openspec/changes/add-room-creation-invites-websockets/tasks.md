## 1. Routing and Entry Flow

- [ ] 1.1 Add Angular Router routes for `/` and `/rooms/:roomCode` while preserving the first-screen app shell.
- [ ] 1.2 Replace auto-created mocked room state with a neutral entry state that shows create-room and join-room controls only.
- [ ] 1.3 Prefill the join flow from `/rooms/:roomCode` and keep the room code available for correction when join or recovery fails.
- [ ] 1.4 Require a valid room name and participant display name before sending a create-room command.
- [ ] 1.5 Require a valid participant display name before joining by invite URL or typed room code.
- [ ] 1.6 Prevent malformed room-code submissions from entering an active room or sending a join command.

## 2. Room Domain and Identity

- [ ] 2.1 Add explicit room, invite, participant, presence, connection, and room error types under the `rooms` feature.
- [ ] 2.2 Add an `identity` service for lightweight participant id, display name, and optional local preferences.
- [ ] 2.3 Implement validation for room names, room codes, participant display names, and invite URL parsing.
- [ ] 2.4 Implement duplicate participant handling keyed by room code and participant id, not display name.
- [ ] 2.5 Keep facilitator assignment explicit when the room creator becomes the initial participant.

## 3. Room Services and Realtime Boundary

- [ ] 3.1 Add a `RoomGateway` boundary for `create_room`, `join_room`, `resume_room`, `leave_room`, heartbeat support, and room event streams.
- [ ] 3.2 Add `RoomPersistence` for minimal recovery anchors: room code, participant id, display name, resume token, and last joined timestamp.
- [ ] 3.3 Add a signal-backed `RoomService` facade with `createRoom`, `joinRoom`, `resumeRoom`, `leaveRoom`, and `copyInviteLink` commands.
- [ ] 3.4 Apply room snapshots and membership events in `RoomService` without exposing transport details to components.
- [ ] 3.5 Track local connection state separately from other participants' presence states.
- [ ] 3.6 Persist recovery anchors after successful create, join, or resume, and clear or ignore stale anchors after leave or invalid recovery.

## 4. Active Room UI

- [ ] 4.1 Show active room name, room code, invite link, participant list, and local connection state only after create, join, or resume succeeds.
- [ ] 4.2 Implement copy-invite confirmation without changing membership, task, planning round, or vote state.
- [ ] 4.3 Render participant membership and presence from `RoomService` and preserve visible room state while reconnecting.
- [ ] 4.4 Show concise retryable errors for invalid or expired invites, unavailable rooms, duplicate join failures, and failed resumes.
- [ ] 4.5 Add semantic labels, visible focus states, useful focus movement, and polite live-region announcements for meaningful membership changes.
- [ ] 4.6 Ensure room codes, invite links, participant names, presence labels, and action text remain readable without overflowing on mobile widths.

## 5. Tests

- [ ] 5.1 Add unit tests for room-name, room-code, display-name, and invite URL validation.
- [ ] 5.2 Add unit tests for duplicate participant merge behavior, presence transitions, and local connection state separation.
- [ ] 5.3 Add `RoomPersistence` tests for storing, reading, TTL cleanup, and clearing recovery anchors.
- [ ] 5.4 Add `RoomService` tests with a fake `RoomGateway` for create, join, resume, leave, snapshots, reconnecting, errors, and duplicate joins.
- [ ] 5.5 Add component tests for default entry, create flow, join flow, invite URL prefill, invalid invite, reconnecting state, and copy-invite confirmation.

## 6. Verification

- [ ] 6.1 Run the project formatting, linting, unit test, and build scripts when available.
- [ ] 6.2 Verify browser flows at desktop and mobile widths for default entry, room creation, invite joining, refresh resume, reconnect state, and error recovery.
