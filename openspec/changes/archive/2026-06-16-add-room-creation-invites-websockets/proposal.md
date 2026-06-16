## Why

Teams need a reliable way to start a live planning poker session and bring other players into the same room before voting can happen. Room creation and invitation over a realtime connection is the foundation for the core collaborative workflow and predictable recovery after refresh or reconnect.

## What Changes

- Add room creation so a facilitator can start a named planning poker room from the usable app screen.
- Add room joining through an invitation link or room code so invited players can enter the same session.
- Add ASP.NET Core SignalR-backed room membership updates so participants see joins, leaves, and reconnects without manual refresh.
- Require a participant display name before creating or joining a room, and add lightweight room identity handling for display names and participant presence during the room flow.
- Add error and recovery states for invalid invites, disconnected sockets, duplicate joins, and refreshed sessions.

## Capabilities

### New Capabilities

- `room-collaboration`: Covers creating named planning poker rooms, inviting players, joining rooms with participant names, and synchronizing room membership/presence through SignalR WebSocket events.

### Modified Capabilities

None.

## Impact

- Adds room creation and invitation flow to the Angular app, likely under the `rooms` and `identity` feature areas.
- Adds a minimal C# ASP.NET Core SignalR backend for in-memory rooms, invites, membership, presence, and resume tokens.
- Introduces a replaceable SignalR/WebSocket service boundary for room events, membership state, reconnect handling, and room error states.
- Defines the initial realtime API contract for room create, join, invite, presence, leave, and reconnect behavior.
- Affects routing or first-screen state so users can create a room, join from an invite, and recover their current room after refresh.
