## Purpose
Define how the application resolves supported locales, presents localized app-owned copy, preserves locale-neutral room data, and keeps translation resources auditable.

## Requirements

### Requirement: Supported Locale Resolution
The system SHALL support `pt-BR`, `en-US`, and `es-ES` as explicit application locales, SHALL resolve one active locale before rendering app-owned UI copy, and SHALL fall back predictably to `en-US` when no supported locale can be resolved.

#### Scenario: URL locale takes precedence
- **WHEN** a user opens the app with a supported locale prefix in the URL
- **THEN** the system uses that URL locale for app-owned UI copy, accessible labels, validation feedback, status announcements, and locale-aware formatting

#### Scenario: Persisted locale is used without URL locale
- **WHEN** a user opens a locale-neutral route without a locale prefix and has a persisted `coffee-planning-poker.locale` value for `pt-BR`, `en-US`, or `es-ES`
- **THEN** the system uses the persisted locale for the application session

#### Scenario: Browser locale is matched
- **WHEN** a user opens a locale-neutral route without a persisted locale preference
- **THEN** the system selects the best supported locale from `navigator.languages` by exact locale match first, language fallback second, and `en-US` fallback last

#### Scenario: Unsupported locale falls back
- **WHEN** the URL, persisted preference, and browser languages do not resolve to `pt-BR`, `en-US`, or `es-ES`
- **THEN** the system uses `en-US` without blocking room creation, room joining, Task management, EstimateCard voting, reveal, or FinalEstimate flows

### Requirement: Flag Locale Selection Persists as Personal Preference
The system SHALL provide a compact flag-based locale selector in the upper-right corner of the app for the current user, SHALL persist the selected locale as a personal preference, and SHALL keep locale preference separate from shared RoomSession state.

#### Scenario: Locale flags are visible in the app shell
- **WHEN** the app shell renders in room entry, active RoomSession, disconnected, reconnecting, or error states
- **THEN** the upper-right corner shows compact flag controls for `pt-BR`, `en-US`, and `es-ES`

#### Scenario: User selects a locale
- **WHEN** a user chooses the Brazil, United States, or Spain flag control for `pt-BR`, `en-US`, or `es-ES`
- **THEN** the system stores the selected value in `coffee-planning-poker.locale` and navigates to the matching localized app variant while preserving the current route intent

#### Scenario: Locale changes inside active room
- **WHEN** a Participant changes locale while viewing an active RoomSession
- **THEN** the system preserves the room route, keeps the local room recovery anchor locale-independent, and recovers the authoritative RoomSession snapshot after the localized app variant loads

#### Scenario: Participants use different locales
- **WHEN** two Participants are connected to the same RoomSession with different selected locales
- **THEN** each Participant sees app-owned UI copy in their own locale while sharing the same room code, Participant names, Tasks, PlanningRound state, ParticipantVote progress, revealed votes, and FinalEstimates

#### Scenario: Locale selector is keyboard accessible
- **WHEN** a keyboard user navigates to the locale selector
- **THEN** each flag control has an accessible language name, selected state, visible focus state, and can be changed without pointer input

### Requirement: Localized Application Copy
The system SHALL display app-owned visible copy, translated attributes, placeholders, form labels, status labels, empty states, dialogs, and action text in the active supported locale across room entry, active RoomSession, Task, PlanningRound, ParticipantVote, reveal, and FinalEstimate workflows.

#### Scenario: Room entry copy is localized
- **WHEN** a user opens the room entry screen in any supported locale
- **THEN** create-room controls, join-room controls, display-name controls, invite-code labels, validation placeholders, pending states, and empty states use localized app-owned copy

#### Scenario: Active room copy is localized
- **WHEN** a Participant enters an active RoomSession in any supported locale
- **THEN** membership labels, connection states, invite actions, Task controls, current Task state, EstimateCard voting controls, PlanningRound status, reveal controls, FinalEstimate controls, and completion summaries use localized app-owned copy

#### Scenario: Facilitator-only controls are localized
- **WHEN** a facilitator views controls for Task selection, reveal, reset, FinalEstimate saving, or RoomSession completion
- **THEN** all facilitator-only action text, disabled states, dialog copy, and status feedback use the facilitator's active locale

#### Scenario: Participant-only states are localized
- **WHEN** a non-facilitator Participant views unavailable facilitator actions, waiting states, vote progress, revealed results, or completed RoomSession state
- **THEN** all app-owned explanatory labels and status feedback use the Participant's active locale

### Requirement: Localized Accessible Feedback
The system SHALL localize accessible names, ARIA labels, ARIA descriptions, live-region announcements, focus-target labels, and screen-reader-only status text in the same active locale as visible app-owned UI copy.

#### Scenario: Room flow announces localized state
- **WHEN** room entry, display-name, pending, active, invalid invite, error, disconnected, or reconnecting state changes
- **THEN** the system announces the meaningful state change through localized accessible feedback without announcing passive heartbeat updates

#### Scenario: Task changes are announced in locale
- **WHEN** a Task is added, selected, estimated, reopened for a PlanningRound, or included in a completed total
- **THEN** the system announces the meaningful Task state change in the active locale while preserving user-entered Task text as entered

#### Scenario: Voting changes are announced in locale
- **WHEN** a ParticipantVote is saved, the PlanningRound is revealed, voting is reset, or the FinalEstimate can be saved
- **THEN** the system announces the meaningful PlanningRound state change in the active locale while keeping EstimateCard labels unchanged

#### Scenario: Focus moves to localized target
- **WHEN** a dialog, error summary, retryable notice, reveal result, or FinalEstimate decision receives focus after a state transition
- **THEN** the focused control or region exposes a localized accessible name and visible focus state

### Requirement: Localized Validation Feedback
The system SHALL map client-side validation codes and validation parameters to localized messages near the presentation boundary instead of treating hard-coded English strings as primary user-facing validation text.

#### Scenario: Room creation validation is localized
- **WHEN** a user attempts to create a RoomSession with an invalid room name or display name
- **THEN** the system keeps the entered values, avoids sending the invalid command, and displays localized validation feedback for each invalid field

#### Scenario: Join validation is localized
- **WHEN** a user attempts to join with a malformed room code or invalid display name
- **THEN** the system keeps the typed room code and display name available for correction and displays localized validation feedback

#### Scenario: Task validation is localized
- **WHEN** a Participant attempts to add a Task with an invalid title or invalid details
- **THEN** the system preserves the entered Task content, avoids sending the invalid command, and displays localized validation feedback

#### Scenario: Validation parameters are localized safely
- **WHEN** validation feedback includes a field limit, count, or formatted value
- **THEN** the system interpolates named parameters safely and formats app-owned numeric values according to the active locale

### Requirement: Localized Error Code Presentation
The system SHALL display localized user-facing messages from stable room, task, vote, reveal, reset, completion, and recovery error codes, and SHALL use backend English message text only as a fallback for unknown codes or diagnostics.

#### Scenario: Invalid invite error is localized
- **WHEN** a user opens an invalid, expired, or unknown invite link
- **THEN** the system preserves any room code present in the route and displays a localized path to retry or enter another code

#### Scenario: Duplicate join error is localized
- **WHEN** a duplicate join or invalid participant resume is rejected for a RoomSession
- **THEN** the system leaves the user outside the active RoomSession, avoids creating duplicate Participants or ParticipantVote records, and displays a localized duplicate-join or recovery message

#### Scenario: Participant command error is localized
- **WHEN** a ParticipantVote, Task add, or join command fails with a known backend error code
- **THEN** the system preserves the latest authoritative RoomSession snapshot and displays a localized retryable message for the failed action

#### Scenario: Facilitator command error is localized
- **WHEN** a facilitator Task selection, reveal, reset, FinalEstimate save, or RoomSession completion command fails with a known backend error code
- **THEN** the system preserves the current Task, PlanningRound, ParticipantVote, and FinalEstimate state and displays a localized retryable message for the failed action

#### Scenario: Unknown backend error uses fallback
- **WHEN** the client receives an unknown backend error code with optional message text
- **THEN** the system displays a localized generic error message and MAY retain the backend message for diagnostics without making it the normal visible UI copy

### Requirement: Locale-Neutral RoomSession Data
The system SHALL preserve participant-provided content, room identifiers, domain identifiers, and planning poker domain values as shared RoomSession data rather than translating them.

#### Scenario: Participant content is preserved
- **WHEN** the active locale changes or differs between Participants
- **THEN** room names, display names, Task titles, Task details, discussion content, room codes, Task ids, round ids, and participant ids remain unchanged

#### Scenario: EstimateCard values are preserved
- **WHEN** EstimateCard options, selected ParticipantVote values, revealed votes, or saved FinalEstimates are shown in any supported locale
- **THEN** the EstimateCard labels remain the shared planning poker values defined by the RoomSession deck

#### Scenario: Mixed-locale room stays synchronized
- **WHEN** Participants using different locales add Tasks, cast ParticipantVotes, reveal a PlanningRound, or save a FinalEstimate
- **THEN** all clients receive the same backend-owned RoomSession state while rendering only app-owned labels and messages in their own locale

### Requirement: Locale-Aware Formatting for App-Owned Values
The system SHALL format app-owned numeric and temporal display values according to the active locale while preserving planning poker domain values that are not locale-owned copy.

#### Scenario: FinalEstimate average is formatted
- **WHEN** a revealed PlanningRound has a computed numeric average such as `1.5`
- **THEN** the system displays the computed average using the active locale's numeric formatting without changing the stored FinalEstimate value

#### Scenario: Completion total is formatted
- **WHEN** a RoomSession completion summary includes the total project estimate
- **THEN** the system displays the total with locale-aware numeric formatting and keeps unestimated Tasks clearly distinguishable

#### Scenario: Timestamp is formatted
- **WHEN** the UI shows an app-owned timestamp for a Task, PlanningRound, Participant presence state, or FinalEstimate event
- **THEN** the system formats the timestamp according to the active locale

### Requirement: Localized Routing and Invite Handling
The system SHALL support localized app routes for `pt-BR`, `en-US`, and `es-ES`, SHALL keep existing locale-neutral routes usable, and SHALL preserve room invite behavior without making invite links depend on the sender's locale.

#### Scenario: Source locale has localized and neutral entry
- **WHEN** a user opens `/en-US` or `/`
- **THEN** the system serves or resolves the `en-US` app variant and keeps the first screen usable for room creation or joining

#### Scenario: Locale-neutral room link resolves
- **WHEN** a user opens an existing locale-neutral invite such as `/rooms/:roomCode`
- **THEN** the system resolves the user's supported locale and routes to the localized join or recovery flow with the room code retained

#### Scenario: Localized room link resolves
- **WHEN** a user opens a localized invite such as `/pt-BR/rooms/:roomCode` or `/es-ES/rooms/:roomCode`
- **THEN** the system uses that route locale and routes to the join or recovery flow with the room code retained

#### Scenario: Copied invite is locale neutral
- **WHEN** a Participant copies the invite link from an active RoomSession
- **THEN** the copied invite identifies the RoomSession without forcing the recipient to use the sender's selected locale

### Requirement: Refresh and Reconnect Preserve Locale
The system SHALL preserve the selected locale across refresh, reconnect, duplicate join recovery, disconnected socket recovery, and room invite navigation while recovering authoritative RoomSession state from backend snapshots.

#### Scenario: Refresh preserves locale and room state
- **WHEN** a Participant refreshes an active RoomSession with valid recovery anchors and a persisted locale
- **THEN** the system reloads in the persisted locale and recovers membership, Tasks, current Task, active PlanningRound, local ParticipantVote visibility, revealed votes, saved FinalEstimates, and completed totals from the backend snapshot

#### Scenario: Reconnect preserves locale and room state
- **WHEN** the realtime connection disconnects and reconnects while a RoomSession is active
- **THEN** the system keeps the visible UI in the active locale and replaces stale local RoomSession state with the recovered backend snapshot

#### Scenario: Resume failure is localized
- **WHEN** a resume attempt fails because the room, invite, participant session, or resume token is no longer valid
- **THEN** the system keeps the resolved locale, retains the room code when available, returns to the join flow, and displays localized recovery feedback

#### Scenario: Locale storage does not replace room recovery
- **WHEN** locale preference exists but room recovery anchors are missing or invalid
- **THEN** the system uses the locale preference for UI copy and asks the user to join with a display name before entering the RoomSession

### Requirement: Translation Coverage and Missing Translation Fallback
The system SHALL keep translation resources for `pt-BR`, `en-US`, and `es-ES` auditable and SHALL display the source `en-US` text when a supported locale is missing an app-owned translation.

#### Scenario: Missing translation falls back to source
- **WHEN** a `pt-BR` or `es-ES` localized app variant lacks a translation for an app-owned message
- **THEN** the system displays the source `en-US` text for that message instead of failing to render the room, Task, PlanningRound, ParticipantVote, reveal, or FinalEstimate UI

#### Scenario: Translation coverage is checked
- **WHEN** localization extraction or coverage checks run
- **THEN** the checks report untranslated or stale `pt-BR` and `es-ES` entries for review while preserving source-locale fallback behavior

#### Scenario: Dynamic messages use stable ids
- **WHEN** TypeScript-owned notices, validation feedback, error messages, ARIA labels, or live-region announcements are extracted
- **THEN** the messages have stable custom identifiers and named placeholders so translation files can be reviewed and updated predictably
