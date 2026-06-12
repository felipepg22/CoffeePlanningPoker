## Context

The current Angular app is a single standalone root component with local signals and mocked planning poker state. It already exposes the intended first-screen workflow: create or join a room, add tasks, vote, reveal, save an estimate, copy an invite, and show participant/reconnect status. The next step is to replace the room-related mock state with feature-owned room collaboration behavior while keeping the first screen usable as the app surface. The initial screen must not create or assume a room automatically; it should first ask the user to create a named room or enter an existing room code, then require a participant display name before the user participates in the planning poker session.

Room creation and invitations are foundational because every later collaborative action depends on a shared room identity, stable participant identity, and realtime membership updates. Facilitators need to create a session quickly, invite teammates by link or code, and recover the room after refresh. Participants need to join with a display name and understand whether the room is connected, reconnecting, invalid, or unavailable.

The implementation must preserve the product direction: warm, focused, task-oriented UI; concise copy; accessible controls; and predictable recovery during live meetings. Backend, realtime, and persistence concerns should remain behind replaceable service boundaries so the initial implementation can evolve without coupling components directly to a specific transport or storage mechanism. This change includes a minimal ASP.NET Core SignalR backend so room membership works across browsers during local development.

## Goals / Non-Goals

**Goals:**

- Show an initial create-or-join room entry flow instead of creating a room on page load.
- Create a room only after an explicit user action with a valid room name and participant display name, then receive a stable room code plus shareable invite link.
- Ask for a participant display name after the user chooses to create a room or enters an existing room code, before entering the session.
- Join a room from either an invite URL or typed room code with a lightweight display name.
- Keep participant membership and presence synchronized through SignalR room events.
- Recover a recently joined room after refresh or reconnect using persisted identity/session anchors.
- Model room, participant, invite, presence, connection, and room error states with explicit TypeScript types.
- Keep room collaboration rules in the `rooms` feature and lightweight display-name preferences in `identity`.
- Keep UI controls semantic, keyboard-accessible, responsive, and explicit about connection/recovery state.

**Non-Goals:**

- Realtime task editing, vote synchronization, reveal synchronization, and final estimate persistence beyond the room anchors needed for this change.
- Authentication, accounts, roles beyond facilitator/participant room behavior, or long-lived user profiles.
- A general state-management library or global event bus.
- Persistent database storage, authentication, accounts, deployment automation, or production hosting work.
- Complex invite permissions, expiring invite management UI, or private room administration beyond invalid/expired invite handling.

## Decisions

### 1. Split room collaboration out of `AppComponent` into feature services and small route-level components

Room creation, joining, membership, presence, and reconnect state will live under `src/app/rooms`. Lightweight display-name and local preference handling will live under `src/app/identity`. The existing root component should become composition/shell code instead of owning room rules directly.

Initial room-facing pieces:

- `rooms/models/room-session.ts` for `RoomSession`, `RoomCode`, `RoomInvite`, `RoomConnectionState`, `ParticipantPresence`, and room error types.
- `rooms/services/room.service.ts` as the component-facing facade with signal-backed state and command methods such as `createRoom`, `joinRoom`, `resumeRoom`, `leaveRoom`, and `copyInviteLink`.
- `rooms/services/room-gateway.ts` for the SignalR transport boundary.
- `rooms/services/room-persistence.ts` for refresh/reconnect anchors stored in browser storage.
- `identity/services/identity.service.ts` for display name, participant id, and optional avatar/color preferences.
- Focused components for create/join controls and room membership display once extraction is useful.

Rationale: this keeps domain rules near the `rooms` owner and prevents the root app from becoming the integration point for transport, persistence, validation, and UI state. It also leaves the current session/task UI free to consume room state later without owning it.

Alternative considered: keep all behavior in `AppComponent` and replace the mock arrays in place. This is faster for a prototype but makes reconnect, WebSocket events, and error states hard to test and easy to scatter across the UI.

### 2. Use a `RoomService` facade with signals at the component boundary and RxJS at transport boundaries

Components will read signal state from `RoomService`, such as the current room, participants, connection state, pending action, and last recoverable error. Component actions call methods on the service instead of mutating room state directly.

`RoomGateway` will expose RxJS streams for WebSocket events because sockets are naturally asynchronous event sources. `RoomService` will subscribe to those streams, apply room rules, and update signals. The service should own cleanup through Angular lifecycle utilities so route changes and app teardown close subscriptions predictably.

Rationale: signals keep local UI updates simple and idiomatic for Angular 21, while RxJS stays where it is strongest: WebSocket events, connection status, retry timing, and backend acknowledgements.

Alternative considered: expose only Observables from the room service. That matches the socket boundary but pushes more subscription and derived-state work into components.

Alternative considered: introduce a broad state-management library. The current scope does not justify it because the shared state is limited and feature-owned services plus signals are sufficient.

### 3. Add Angular Router for invite links and refresh-safe room URLs

The app should support these routes:

- `/` for the default create/join workflow.
- `/rooms/:roomCode` for invite links and refresh-safe room recovery.

The `/` route should render an entry form with two clear paths: create a new named room or enter a room code. It should not call `createRoom`, allocate a room code, show participant membership, or initialize room-specific state until the user chooses one of those paths. The create-room path should require a room name and participant display name before creating the room. The join-room path should require a participant display name before the user enters the planning poker session.

The room code from the URL should prefill join state. If a valid stored participant session exists for that room, `RoomService` should attempt `resumeRoom`; otherwise, the user lands in the display-name step with the code already set.

Rationale: invite links and reload recovery are core requirements. The official Angular Router provides predictable URL parsing, direct navigation, and browser refresh behavior without hand-rolled location parsing.

Alternative considered: manually parse `window.location.pathname` and keep the app single-route. This avoids adding router setup but creates fragile refresh and navigation behavior as the app grows.

### 4. Add a minimal ASP.NET Core SignalR room backend

The repo will include `server/CoffePlanningPoker.Api`, an ASP.NET Core Minimal API project with a SignalR hub at `/hubs/rooms`. The backend will own room codes, invite links, participants, presence, resume tokens, and room errors in an in-memory store. It will expose CORS for the Angular dev server at `http://localhost:4200` and listen on `http://localhost:5050` for local development.

Rationale: real multi-browser collaboration needs server-owned room state. SignalR keeps the implementation small while still using WebSockets where available, and its groups map directly to room membership.

Alternative considered: a frontend-only gateway fallback. That is useful for UI prototyping but cannot validate cross-device joins, backend-owned presence, or resume-token behavior.

Alternative considered: raw WebSockets. This keeps the wire format minimal but requires custom connection routing, group membership, reconnect, and event dispatch plumbing that SignalR already provides.

### 5. Define a small, idempotent room realtime contract

The client transport should support an explicit message contract even if the concrete backend changes later.

SignalR hub methods:

- `CreateRoom` with room name and facilitator identity, sent only after the user chooses to create a room and submits a display name.
- `JoinRoom` with room code and participant identity.
- `ResumeRoom` with room code, participant id, and resume token when available.
- `LeaveRoom` for voluntary exits.
- `Heartbeat` for presence freshness.

SignalR server events:

- `RoomSnapshot` with current room metadata, participants, presence states, local participant id, and resume token.
- `ParticipantJoined`, `ParticipantLeft`, and `PresenceChanged` for live membership updates.
- `RoomError` for invalid invite, expired room, duplicate or rejected join, unavailable room, and transport failures.

Joins and resumes should be idempotent by participant id plus room code. Display names are not unique identifiers. Repeating a join from the same persisted participant should update that participant connection instead of creating duplicate rows.

Rationale: snapshots make reconnect deterministic, while delta events keep live membership fast. Idempotent commands make refresh and retry behavior safer under spotty connections.

Alternative considered: client-only rooms using local state and copied codes. That cannot satisfy shared membership, joins, leaves, or reconnect semantics across teammates.

### 6. Persist only minimal recovery anchors in browser storage

`RoomPersistence` should store the minimum data needed to recover a recent session:

- Room code.
- Participant id.
- Display name.
- Resume token if supplied by the backend.
- Last joined timestamp for TTL cleanup.

The room snapshot, task list, votes, and participant list should come from the backend after resume instead of being treated as authoritative local state.

Rationale: minimal persistence supports refresh and reconnect without creating stale local truth. It also keeps privacy risk low for a shared workstation or screen-share environment.

Alternative considered: persist full room state locally. That improves offline display but risks showing stale membership and conflicts with the realtime source of truth.

### 7. Treat presence as explicit state, not inferred copy

Participants should have a presence state such as `connected`, `reconnecting`, `disconnected`, or `left`. UI labels should remain concise, for example `Here`, `Reconnecting`, or `Left`, with hidden votes still hidden until reveal in later session work.

The connection state for the current browser should be separate from participant presence. A user can be reconnecting locally while the last known room snapshot still includes other participants.

Rationale: live sessions need clear recovery state. Separating local connection from participant presence avoids vague labels and prevents the facilitator from confusing socket trouble with voting progress.

Alternative considered: infer presence only from socket connect/disconnect events. That misses transient reconnects, duplicate tabs, and backend-side stale connection detection.

### 8. Keep UI flow dense, accessible, and recovery-oriented

The first screen should continue to be app UI, but it should start in a neutral room entry state. The primary visible controls should be an input for a room code and an explicit action to create a new room. Creating a room should require a room name and participant display name; joining a room should require a participant display name. Invite code, room state, participants, and connection status should become visible only once a room is active and the required names have been submitted. Error states should be actionable and concise:

- Invalid invite or room not found: keep the typed/prefilled code and let the user retry or choose another code.
- Disconnected socket: preserve the visible room and show reconnecting status without clearing participants.
- Duplicate/repeated join: resume or update the existing participant when the backend allows it; otherwise show a clear blocked state.
- Refresh with recoverable session: attempt resume and show reconnecting state before falling back to manual join.

Controls should remain semantic buttons, labels, forms, and live regions. Membership changes should update a polite live region only when useful, avoiding noisy announcements for every heartbeat. Layout must prevent invite codes, participant names, and action labels from overflowing on mobile.

Rationale: the app is used during focused meetings, so room state should be obvious and controls should not require explanation-heavy copy.

Alternative considered: a separate onboarding or marketing-like landing view before room creation. This conflicts with the product requirement that the first screen starts in the workflow.

### 9. Test room rules independently from the SignalR transport

Unit tests should cover backend room rules, room-code validation, display-name validation, invite URL parsing, idempotent participant merge behavior, presence transitions, persistence TTL cleanup, and recovery fallback rules. `RoomService` tests should use a fake `RoomGateway` so socket timing stays deterministic. Component tests should cover create, join, invalid invite, reconnecting, and copied-invite states with accessible labels and messages.

Rationale: room collaboration has failure modes that are easier to verify through domain and service tests than through brittle DOM or timer-heavy socket tests.

Alternative considered: validate mostly through end-to-end browser flows. Those are useful later but too broad and timing-sensitive as the main safety net for these rules.

## Risks / Trade-offs

- [Backend contract may change] -> Keep `RoomGateway` and SignalR message mapping isolated so component and domain code do not depend on hub-level shapes.
- [Reconnect logic can create duplicate participants] -> Use stable participant ids, resume tokens, and idempotent server commands; test duplicate join and refresh cases directly.
- [Browser storage can become stale or expose display names on shared devices] -> Store only minimal anchors, apply a TTL, and provide leave/clear behavior when the user exits a room.
- [Adding router setup increases initial app structure] -> Limit routes to `/` and `/rooms/:roomCode` until more navigation exists; keep route components thin.
- [Presence updates can become noisy for assistive technology] -> Announce only meaningful room state changes through polite live regions and avoid announcing heartbeat churn.
- [The UI can over-index on room setup and crowd out voting] -> Keep the initial create/join entry compact, collapse setup controls once connected, and preserve the central round/task/voting area as the primary workspace.
- [SignalR retry behavior can become timer-heavy and flaky in tests] -> Put retry timing behind the gateway boundary and use fake gateway events in service tests.

## Migration Plan

1. Add routing and room URL parsing while preserving the current first-screen layout.
2. Extract room and identity types from the root component into `rooms` and `identity` feature areas.
3. Add the ASP.NET Core SignalR API with an in-memory room store and local dev CORS.
4. Add `RoomService`, `RoomGateway`, and `RoomPersistence` using the local SignalR endpoint by default.
5. Replace any pre-created mocked room state with a neutral entry state that asks the user to create a room or enter a room code.
6. Add a required display-name step after create-room selection or room-code entry and before session participation.
7. Replace mocked create/join/copy invite behavior with service calls and explicit pending/error states.
8. Replace mocked participant membership with room snapshot and membership events.
9. Add deterministic unit tests for backend room rules, frontend room rules, service state transitions, persistence, and important component interactions.
10. Run build checks and verify desktop/mobile room flows in the browser.

Rollback is straightforward while persistence remains in-memory: keep the existing mocked workflow intact until the service-backed flow is wired, then revert the route/provider/service integration and backend project if the realtime contract blocks implementation. Persisted recovery anchors can be safely ignored or cleared because they are not authoritative room data.

## Open Questions

- What deployed backend URL should the Angular app target after local development?
- Should room codes be generated by the backend only, or can the client request a human-friendly prefix such as the current `BREW-482` style?
- What is the intended room lifetime or expiration policy for invalid/expired invite handling?
- Should a facilitator be a distinct role in the room contract now, or should facilitator-specific permissions wait for later voting/reveal synchronization work?
- How should multiple tabs for the same participant be represented: one participant with multiple connections, or last connection wins?
