## Context

CoffeePlanningPoker is an Angular 21 standalone client backed by an ASP.NET Core
SignalR room API. The current app is usable from the first screen, but visible UI
copy, validation feedback, announcements, status labels, and retryable error
messages are mostly embedded in Angular templates and component/service logic.

The backend already returns stable room/session error codes through
`RoomErrorDto.Code`, but it also returns English messages. The long-term
localized surface should treat error codes as the contract and backend messages
as diagnostics or fallback text only. Locale is a client preference, not room
state: participants in the same room can use different languages while sharing
the same tasks, votes, room code, participant names, and snapshots.

## Goals / Non-Goals

**Goals:**

- Localize app-owned UI copy, form feedback, accessible labels, live-region
  announcements, and retryable error messages for `pt-BR`, `en-US`, and `es-ES`.
- Preserve locale choice across refresh, reconnect, and room invite navigation
  without changing room membership, voting, task, or persistence semantics.
- Keep the backend locale-neutral and display localized client messages from
  stable machine-readable error codes.
- Use established Angular localization and formatting support with the smallest
  necessary dependency footprint.
- Keep localization boundaries testable so missing-translation fallback,
  unsupported locale fallback, and error-code mappings behave predictably.

**Non-Goals:**

- Translating participant-entered room names, display names, task titles, task
  notes, discussion content, room codes, task IDs, round IDs, or estimate card
  values.
- Adding instant in-place language switching without a localized app reload.
- Changing planning poker rules, facilitator permissions, realtime
  synchronization, recovery tokens, or room expiration behavior.
- Introducing a broad state-management library or a third-party i18n framework.

## Decisions

### Use Angular native localization with localized app variants

Use Angular's native localization flow for translatable templates, attributes,
and TypeScript strings. Add `@angular/localize`, configure `en-US` as the source
locale, and store checked-in translation resources under `src/locale`:

- `messages.en-US.xlf` as the source-language resource/reference.
- `messages.pt-BR.xlf` for Brazilian Portuguese.
- `messages.es-ES.xlf` for Spanish from Spain.

Templates should use `i18n` and `i18n-*` markers for visible text, placeholders,
ARIA labels, and other translated attributes. Dynamic component/service messages
should use `$localize` with stable custom IDs and named placeholders. Build
configuration should produce locale-specific variants. Missing translations must
fall back to the source `en-US` text so incomplete locale files do not break
local development, CI builds, or live sessions; extraction and coverage checks
should still report untranslated `pt-BR` and `es-ES` entries for review.

Rationale: this keeps the project inside Angular-supported tooling, gives
translation extraction and AOT replacement, and avoids inventing plural,
attribute, and ICU handling in app code. The one dependency is an official
Angular package specifically required for Angular localization.

Alternatives considered:

- Runtime dictionary service built with signals. This would allow instant
  language changes, but it would recreate i18n concerns that Angular already
  handles and would make template attributes, ICU messages, and extraction more
  fragile.
- Third-party runtime i18n library. This would add capability the app does not
  yet need and would expand the dependency surface for a focused first i18n
  pass.

### Add a small locale preference and navigation boundary

Represent supported locales with an explicit `SupportedLocale` type and constants
for `pt-BR`, `en-US`, and `es-ES`. Locale selection should resolve in this order:

1. A locale prefix already present in the URL.
2. A persisted `coffee-planning-poker.locale` preference.
3. The best supported match from `navigator.languages` using exact match first,
   then language fallback (`pt` -> `pt-BR`, `en` -> `en-US`,
   `es` -> `es-ES`).
4. `en-US` as the source-locale fallback.

Changing locale navigates to the matching localized app variant and preserves the
current room route, for example `/rooms/brew-482` or `/pt-BR/rooms/brew-482`.
The reload is acceptable because locale changes are infrequent and room recovery
already uses a local room anchor plus authoritative SignalR snapshots. The room
anchor storage key must remain locale-independent so changing language does not
break resume.

Placement:

- `identity` owns the persisted locale preference because it is a lightweight
  user preference like display name.
- `shared/i18n` owns locale constants, detection, route-preserving navigation,
  and reusable presentation helpers because rooms, session, tasks, and app shell
  copy all consume them.
- The locale selector is an app-shell/shared control, rendered compactly in the
  topbar so the first screen remains the usable room workflow.

Alternatives considered:

- Store locale on the room or participant snapshot. This would incorrectly make
  a personal display preference part of collaborative room state and would
  complicate reconnect behavior.
- Use only browser detection without a selector. That fails the requirement to
  keep a user-chosen language stable across refresh and reconnect.

### Translate errors and validation at the presentation boundary

Keep room, session, and task services focused on domain state and command
results. Services should expose `RoomErrorCode` values plus optional interpolation
data; components should display localized messages through shared message
helpers rather than reading backend English messages directly.

Client-side validation helpers should stop returning hard-coded English display
text as the primary result. They should return a stable validation code and
parameters, then map those codes to localized messages near the presentation
boundary. Backend command failures should continue to return `RoomErrorDto.Code`
for all room, task, vote, reveal, reset, completion, and recovery failures. The
`Message` field can remain for diagnostics, but the Angular UI should prefer
localized code maps and use the server message only for unknown codes.

Rationale: this keeps backend APIs replaceable and locale-neutral while making
all user-facing text auditable in translation resources.

Alternatives considered:

- Let the backend localize messages from request locale. This couples locale to
  realtime commands, makes mixed-language rooms harder to reason about, and adds
  no value when the client already owns the UI language.
- Keep using backend messages as visible fallback. That preserves English leaks
  in failure paths and makes translation coverage incomplete.

### Preserve participant content and format only app-owned values

Do not translate user-entered room names, display names, task titles, task notes,
or any persisted domain identifiers. Preserve estimate card labels exactly as
defined by the planning poker deck. For app-owned numeric or temporal display,
use Angular locale-aware formatting through `LOCALE_ID`, `DecimalPipe`,
`DatePipe`, or small shared helpers that delegate to Angular/Intl formatting.

The existing `formatEstimate` behavior can move behind a helper that keeps card
values stable and formats computed averages consistently per locale. ARIA labels
and live-region announcements should use the same localized message helpers as
visible UI text so screen reader feedback does not remain in the source language.

Alternatives considered:

- Translate estimate card labels such as `?`. These are domain values, not UI
  copy, and translating them would risk desynchronizing votes across clients.
- Localize participant-entered content. That is out of scope and would require a
  separate content translation capability.

### Keep the backend contract stable and locale-neutral

ASP.NET Core room APIs and SignalR hub methods should not accept locale for this
change. They should keep returning snapshots with raw room/session data and
stable error codes. Any server edits should be limited to improving code/message
separation, adding missing codes if an English-only failure path exists, and
covering those codes in tests.

Rationale: the backend owns authoritative planning poker state, not presentation
language. Keeping error codes stable lets the Angular client translate without
making the realtime API dependent on user language.

Alternatives considered:

- Add localized server resources. This duplicates client translation work and
  would still not cover client-side validation, ARIA labels, and local notices.

## Risks / Trade-offs

- [Locale switch reloads the app] -> Preserve the current route, keep recovery
  anchors locale-independent, and rely on existing resume/snapshot recovery.
- [Translation files drift from templates and `$localize` strings] -> Add an
  extraction/check step that reports untranslated entries while the displayed
  fallback remains the source `en-US` message.
- [Dynamic notices interpolate user content incorrectly] -> Use named
  placeholders and leave participant/task text untranslated and escaped by
  Angular bindings.
- [Backend English messages leak into the UI] -> Route all `RoomErrorCode` and
  validation-code displays through shared localized message helpers, with tests
  for each known code.
- [Locale-prefixed URLs could make invites less portable] -> Keep copied invite
  links locale-neutral when possible and let each recipient resolve their own
  supported locale before joining.
- [Translated copy overflows compact controls] -> Keep labels concise, test
  `pt-BR` and `es-ES` at mobile and desktop widths, and keep buttons/icons sized
  with responsive constraints.

## Migration Plan

1. Add Angular localization configuration and `@angular/localize`.
2. Add supported-locale constants, locale detection, preference persistence, and
   route-preserving locale navigation.
3. Extract the current English UI copy into `messages.en-US.xlf`, then create
   `pt-BR` and `es-ES` resource files with stable message IDs.
4. Replace template copy, translated attributes, component notices, validation
   messages, status labels, and accessible announcements with Angular i18n or
   `$localize` helpers.
5. Update client error handling so `RoomErrorCode` maps to localized display
   messages and backend `Message` is not the normal visible path.
6. Add or update focused tests for locale fallback, missing-translation fallback
   to `en-US`, preference persistence, route preservation, translation coverage,
   validation messages, and error-code mappings.
7. Build and smoke test all locale variants at desktop and mobile widths,
   including create, join, invite link, refresh, reconnect, vote, reveal, save
   estimate, and completion flows.

Rollback is straightforward because localization is additive: revert localized
build configuration and message helper usage to the source-language templates and
service messages. Backend rollback should not be needed unless new error codes
are added; if codes are added, keep them backward-compatible rather than removing
existing codes.

## Resolved Questions

- Source-locale URL placement: this question is about route shape, not wording.
  The implementation must decide whether English is served only from `/`, only
  from `/en-US`, or from both. Use both: deploy the source locale at `/en-US` for
  parity with `pt-BR` and `es-ES`, and keep `/` as a source-locale entry point
  that redirects to or serves `en-US`. Existing locale-neutral room links such
  as `/rooms/:roomCode` must continue to resolve through locale detection so old
  invite links keep working.
- Final `pt-BR` and `es-ES` copy review: before release, run a
  language-specific product-copy review for each locale using a specialized
  reviewer, subagent, or equivalent manual process. No installed impeccable
  skill is assumed for this repository.
- Missing translations: fall back to the source `en-US` message for display in
  every environment. Builds and checks may report missing `pt-BR` and `es-ES`
  translations, but missing translations must not block local development or
  leave users without readable UI text.
