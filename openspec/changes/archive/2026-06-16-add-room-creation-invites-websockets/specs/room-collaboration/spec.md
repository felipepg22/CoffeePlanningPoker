## ADDED Requirements

### Requirement: Room Entry Starts Without an Active Room
The system SHALL present a room entry state that lets a user create a RoomSession or join an existing RoomSession, and SHALL NOT allocate, assume, or display an active RoomSession before an explicit create submission with a valid room name and participant display name or a join submission with a valid room code and participant display name.

#### Scenario: Default route has no recoverable room
- **WHEN** a user opens the default app route without a valid recoverable room anchor
- **THEN** the system shows create-room and join-room controls without an active room code, invite link, Participant list, PlanningRound state, EstimateCard voting controls, ParticipantVote status, Task controls, or FinalEstimate controls

#### Scenario: User chooses to create a room
- **WHEN** a user chooses the create-room path
- **THEN** the system asks for a required room name and participant display name before creating the RoomSession

#### Scenario: User enters a room code
- **WHEN** a user submits a typed room code or opens an invite URL without a valid recoverable participant session
- **THEN** the system keeps the room code and asks for a required participant display name before joining the RoomSession

### Requirement: Room Creation Establishes a Facilitated RoomSession
The system SHALL create a RoomSession only after a user submits a valid room name and participant display name for the create-room path, and SHALL make the creator the initial facilitator Participant for that RoomSession.

#### Scenario: Room creation succeeds
- **WHEN** a user submits a valid room name and participant display name for the create-room path and room creation succeeds
- **THEN** the system enters the active named RoomSession with a stable room code, a shareable invite link, the creator represented as the facilitator Participant, and a connected local room state

#### Scenario: Room name is invalid
- **WHEN** a user attempts to create a RoomSession with a missing or invalid room name
- **THEN** the system keeps the user in the create-room flow, identifies the room-name problem, and does not send a create-room command

#### Scenario: Room creation is pending
- **WHEN** a room creation request is in progress
- **THEN** the system prevents duplicate create submissions and communicates the pending state without clearing the entered room name or participant display name

#### Scenario: Room creation fails
- **WHEN** room creation fails because the room service or realtime connection is unavailable
- **THEN** the system stays in the create-room flow, preserves the submitted room name and participant display name, and shows a concise retryable error state

### Requirement: Room Invitations Are Shareable
The system SHALL expose a room code and invite link for an active RoomSession so the facilitator and participants can invite others to the same room.

#### Scenario: Active room exposes invite details
- **WHEN** a RoomSession is active
- **THEN** the system shows the room code and a shareable invite link that identifies the same RoomSession

#### Scenario: User copies an invite link
- **WHEN** a user activates the copy-invite action for an active RoomSession
- **THEN** the system copies the invite link and confirms the result without changing RoomSession membership or PlanningRound state

#### Scenario: Invite link is opened directly
- **WHEN** a user opens a valid invite link for a room
- **THEN** the system routes to the room join flow with the room code already populated

### Requirement: Participants Join by Invite Link or Room Code
The system SHALL allow a Participant to join a RoomSession using either a valid invite URL or a typed room code plus a valid participant display name.

#### Scenario: Participant joins with invite URL
- **WHEN** a user opens a valid invite URL, submits a valid display name, and the room accepts the join
- **THEN** the system enters the active RoomSession as that Participant and shows the current room membership

#### Scenario: Participant joins with typed room code
- **WHEN** a user enters a valid room code, submits a valid display name, and the room accepts the join
- **THEN** the system enters the matching RoomSession as that Participant and uses the same room membership state as invite-link joins

#### Scenario: Display name is invalid
- **WHEN** a user attempts to create or join a RoomSession with a missing or invalid display name
- **THEN** the system keeps the user in the display-name step, identifies the display-name problem, and does not send a create-room or join-room command

#### Scenario: Room code is invalid before join
- **WHEN** a user submits a malformed room code
- **THEN** the system keeps the typed value available for correction and does not attempt to enter a RoomSession

### Requirement: Membership and Presence Synchronize Through Realtime Events
The system SHALL synchronize active RoomSession membership and ParticipantPresence from ASP.NET Core SignalR room snapshots and membership events without requiring manual refresh.

#### Scenario: Backend owns shared room state
- **WHEN** two browser clients connect to the same RoomSession through the SignalR hub
- **THEN** both clients receive the same backend-owned RoomSession membership state

#### Scenario: Room snapshot is received
- **WHEN** the system receives a room snapshot for the active RoomSession
- **THEN** it replaces stale local membership with the snapshot Participants and their ParticipantPresence states

#### Scenario: Participant joins the room
- **WHEN** a realtime event reports that a Participant joined the active RoomSession
- **THEN** the Participant appears in the room membership list without requiring existing users to refresh

#### Scenario: Participant leaves or disconnects
- **WHEN** a realtime event reports that a Participant left, disconnected, reconnected, or is reconnecting
- **THEN** the system updates that ParticipantPresence while preserving the rest of the RoomSession state

#### Scenario: Local connection state changes
- **WHEN** the current browser loses or restores its room connection
- **THEN** the system updates the local connection state separately from other Participants' ParticipantPresence states

### Requirement: Refresh and Reconnect Preserve Recoverable Rooms
The system SHALL preserve only the minimum room recovery anchors needed to resume a recent RoomSession and SHALL recover from refresh or reconnect without treating locally stored room data as authoritative.

#### Scenario: User refreshes with valid recovery anchors
- **WHEN** a user refreshes a room URL and valid recovery anchors exist for that room code and Participant
- **THEN** the system attempts to resume the RoomSession using the stored participant id and resume token, then replaces local state with the recovered room snapshot

#### Scenario: User refreshes without valid recovery anchors
- **WHEN** a user opens or refreshes a room URL without valid recovery anchors
- **THEN** the system keeps the room code and asks for a display name before joining

#### Scenario: Socket disconnects during an active room
- **WHEN** the realtime connection disconnects while a RoomSession is active
- **THEN** the system keeps the visible RoomSession and Participant list, shows a reconnecting local connection state, and attempts recovery without clearing the current user input

#### Scenario: Resume fails
- **WHEN** a resume attempt fails because the room, invite, participant session, or resume token is no longer valid
- **THEN** the system returns to the join flow with the room code retained and a concise recovery error

### Requirement: Duplicate Joins Do Not Create Duplicate Participants
The system SHALL use stable participant identity for joins and resumes so repeated attempts for the same Participant and RoomSession do not create duplicate participant rows when the room accepts the identity.

#### Scenario: Same participant rejoins after refresh
- **WHEN** a join or resume request uses the same room code and participant id as an existing Participant
- **THEN** the system represents that user as one Participant and updates the existing ParticipantPresence instead of adding a duplicate

#### Scenario: Two participants use the same display name
- **WHEN** two different participant ids join the same RoomSession with the same display name
- **THEN** the system treats them as separate Participants because display names are not unique identifiers

#### Scenario: Duplicate join is rejected
- **WHEN** the room rejects a repeated join because the participant identity cannot be resumed or reused
- **THEN** the system shows a blocked duplicate-join error and leaves the user outside the active RoomSession until they choose a valid join path

### Requirement: Room Errors Are Actionable and Recoverable
The system SHALL show concise, actionable states for invalid invites, expired rooms, unavailable rooms, duplicate join failures, and disconnected realtime connections.

#### Scenario: Invite is invalid or expired
- **WHEN** a user opens an invalid, expired, or unknown invite link
- **THEN** the system shows that the room cannot be joined, preserves the room code if one was present, and offers a path to retry or enter another code

#### Scenario: Room becomes unavailable during join
- **WHEN** a valid-looking room code cannot be joined because the room service reports the room as unavailable
- **THEN** the system stays in the join flow, preserves the room code and display name, and shows a retryable unavailable-room state

#### Scenario: Realtime connection is disconnected
- **WHEN** the realtime connection is disconnected while the user is in an active RoomSession
- **THEN** the system communicates the disconnected or reconnecting state without hiding the invite details or current Participant list

### Requirement: Room Flow Is Accessible and Responsive
The system SHALL provide semantic, keyboard-accessible, responsive controls and state announcements for room creation, room joining, invite sharing, membership updates, and room recovery.

#### Scenario: Keyboard user creates or joins a room
- **WHEN** a user navigates the room entry, display-name, create-room, join-room, copy-invite, or leave-room controls by keyboard
- **THEN** every control has a visible focus state, an accessible name, and can be completed without pointer input

#### Scenario: Room flow changes step
- **WHEN** the room flow moves between entry, display-name, pending, active, error, or reconnecting states
- **THEN** focus moves to the next useful control or status region without trapping the user

#### Scenario: Membership changes are announced
- **WHEN** a meaningful Participant join, leave, disconnect, or reconnect event changes visible room membership
- **THEN** the system announces the change through a polite live region without announcing heartbeat-only updates

#### Scenario: Room UI is used on a narrow screen
- **WHEN** room code, invite link, Participant name, presence label, or action text is shown on a mobile-width viewport
- **THEN** the text remains readable and does not overlap or overflow interactive controls
