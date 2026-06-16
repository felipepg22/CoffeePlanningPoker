## 1. Routing and Entry Flow

- [x] 1.1 Add Angular Router routes for `/` and `/rooms/:roomCode` while preserving the first-screen app shell.
- [x] 1.2 Replace auto-created mocked room state with a neutral entry state that shows create-room and join-room controls only.
- [x] 1.3 Prefill the join flow from `/rooms/:roomCode` and keep the room code available for correction when join or recovery fails.
- [x] 1.4 Require a valid room name and participant display name before sending a create-room command.
- [x] 1.5 Require a valid participant display name before joining by invite URL or typed room code.
- [x] 1.6 Prevent malformed room-code submissions from entering an active room or sending a join command.

## 2. Room Domain and Identity

- [x] 2.1 Add explicit room, invite, participant, presence, connection, and room error types under the `rooms` feature.
- [x] 2.2 Add an `identity` service for lightweight participant id, display name, and optional local preferences.
- [x] 2.3 Implement validation for room names, room codes, participant display names, and invite URL parsing.
- [x] 2.4 Implement duplicate participant handling keyed by room code and participant id, not display name.
- [x] 2.5 Keep facilitator assignment explicit when the room creator becomes the initial participant.

## 3. Room Services and Realtime Boundary

- [x] 3.1 Add an ASP.NET Core SignalR API project with a `/hubs/rooms` hub, local dev CORS, and an in-memory room store.
- [x] 3.2 Implement backend room creation, join, resume, leave, heartbeat, room-code generation, resume tokens, TTL cleanup, duplicate participant handling, and presence transitions.
- [x] 3.3 Add backend tests for create, join, resume, leave, duplicate participant identity, duplicate display names, invalid codes, expired rooms, resume-token rejection, and presence transitions.
- [x] 3.4 Add a `RoomGateway` boundary for `CreateRoom`, `JoinRoom`, `ResumeRoom`, `LeaveRoom`, heartbeat support, and room event streams.
- [x] 3.5 Add a SignalR-backed `RoomGateway` implementation for the local ASP.NET Core hub.
- [x] 3.6 Add `RoomPersistence` for minimal recovery anchors: room code, participant id, display name, resume token, and last joined timestamp.
- [x] 3.7 Add a signal-backed `RoomService` facade with `createRoom`, `joinRoom`, `resumeRoom`, `leaveRoom`, and `copyInviteLink` commands.
- [x] 3.8 Apply room snapshots and membership events in `RoomService` without exposing transport details to components.
- [x] 3.9 Track local connection state separately from other participants' presence states.
- [x] 3.10 Persist recovery anchors after successful create, join, or resume, and clear or ignore stale anchors after leave or invalid recovery.

## 4. Active Room UI

- [x] 4.1 Show active room name, room code, invite link, participant list, and local connection state only after create, join, or resume succeeds.
- [x] 4.2 Implement copy-invite confirmation without changing membership, task, planning round, or vote state.
- [x] 4.3 Render participant membership and presence from `RoomService` and preserve visible room state while reconnecting.
- [x] 4.4 Show concise retryable errors for invalid or expired invites, unavailable rooms, duplicate join failures, and failed resumes.
- [x] 4.5 Add semantic labels, visible focus states, useful focus movement, and polite live-region announcements for meaningful membership changes.
- [x] 4.6 Ensure room codes, invite links, participant names, presence labels, and action text remain readable without overflowing on mobile widths.

## 5. Tests

- [x] 5.1 Add unit tests for room-name, room-code, display-name, and invite URL validation.
- [x] 5.2 Add unit tests for duplicate participant merge behavior, presence transitions, and local connection state separation.
- [x] 5.3 Add `RoomPersistence` tests for storing, reading, TTL cleanup, and clearing recovery anchors.
- [x] 5.4 Add `RoomService` tests with a fake `RoomGateway` for create, join, resume, leave, snapshots, reconnecting, errors, and duplicate joins.
- [x] 5.5 Add component tests for default entry, create flow, join flow, invite URL prefill, invalid invite, reconnecting state, and copy-invite confirmation.

## 6. Verification

- [x] 6.1 Run `dotnet test`, `npm test`, and `npm run build`.
- [x] 6.2 Verify browser flows at desktop and mobile widths for default entry, room creation, invite joining, refresh resume, reconnect state, and error recovery with the SignalR API and Angular dev server running.
