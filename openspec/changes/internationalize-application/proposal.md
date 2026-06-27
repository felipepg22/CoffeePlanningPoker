## Why

CoffeePlanningPoker currently assumes one UI language, which limits live planning sessions for teams that work in Portuguese, English, or Spanish. Internationalizing the app now keeps room creation, task estimation, voting, errors, and recovery states understandable without changing the collaborative planning poker workflow.

## What Changes

- Add application localization for `pt-BR`, `en-US`, and `es-ES` across the first-screen room flow, active room session, task management, voting rounds, reveal/final-estimate flow, empty states, validation feedback, and retryable errors.
- Provide a locale selection and detection flow that chooses a supported locale, keeps the choice stable across refresh/reconnect, and falls back predictably when the browser locale is unsupported.
- Move user-facing UI copy and accessible labels/status announcements out of hard-coded Angular templates and component logic into locale-aware resources.
- Ensure backend-owned command failures remain driven by stable error codes so clients can display localized messages for room, task, vote, reveal, reset, completion, and recovery failures.
- Preserve user-entered content, room names, display names, task titles, task details, room codes, estimate card values, timestamps, and domain identifiers as entered or formatted appropriately for the selected locale.
- Non-goal: translating arbitrary participant-provided room, display-name, task, or discussion content.
- Non-goal: changing planning poker rules, room membership behavior, realtime synchronization, or persistence semantics.

## Capabilities

### New Capabilities

- `application-localization`: Locale selection, fallback, translated UI copy, localized accessible feedback, and client handling of backend error codes for `pt-BR`, `en-US`, and `es-ES`.

### Modified Capabilities

- None.

## Impact

- Angular application shell, routing-adjacent room entry flows, room/session/task/voting components, shared UI helpers, form validation messages, live-region announcements, and any current hard-coded template text.
- Translation resource files for `pt-BR`, `en-US`, and `es-ES`, plus tests that verify coverage and fallback behavior.
- Client services that map backend room and session error codes to displayed messages.
- ASP.NET Core room APIs and SignalR boundaries only where needed to keep stable machine-readable error codes separate from localized client copy; `InMemoryRoomStore` currently returns English message strings and should not become the long-term source of user-facing localized text.
- Refresh and reconnect recovery should preserve the selected locale while continuing to recover authoritative room state from backend snapshots.
