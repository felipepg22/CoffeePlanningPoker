## 1. Localization Setup

- [x] 1.1 Add `@angular/localize` and configure Angular i18n with `en-US` as the source locale and localized `pt-BR`, `en-US`, and `es-ES` app variants.
- [x] 1.2 Add checked-in translation resources under `src/locale` for `messages.en-US.xlf`, `messages.pt-BR.xlf`, and `messages.es-ES.xlf`.
- [x] 1.3 Register locale data needed for Angular pipes and ensure `LOCALE_ID` is available to app-owned formatting helpers in each localized variant.
- [x] 1.4 Add npm scripts or documented commands for extracting messages, checking translation coverage, building all locale variants, and serving a localized variant locally.

## 2. Locale Resolution and Preference

- [x] 2.1 Add a `SupportedLocale` type, locale constants, locale-prefix parsing, and best-match browser language resolution in `shared/i18n`.
- [x] 2.2 Extend `IdentityService` with the locale preference key `coffee-planning-poker.locale` without changing participant id, display name, or room recovery storage.
- [x] 2.3 Implement route-preserving locale navigation that handles `/`, `/en-US`, `/pt-BR`, `/es-ES`, `/rooms/:roomCode`, and localized room routes.
- [x] 2.4 Add focused tests for URL locale precedence, persisted locale resolution, browser language matching, unsupported locale fallback, and route preservation.

## 3. Locale Selector

- [x] 3.1 Add a compact flag-based locale selector in the app shell topbar for `pt-BR`, `en-US`, and `es-ES`.
- [x] 3.2 Persist selected locale changes and navigate to the matching localized app variant while preserving the current room route intent.
- [x] 3.3 Make each flag control keyboard reachable with localized accessible names, selected state, visible focus, and no pointer-only behavior.
- [x] 3.4 Add component tests for selector rendering, preference writes, route-preserving navigation, and active-locale selected state.

## 4. Localized UI Copy

- [x] 4.1 Add Angular `i18n` and `i18n-*` markers for room entry, room summary, task, voting, reveal, final estimate, completion, recovery, and empty-state template copy.
- [x] 4.2 Convert component-owned notices, button labels, status labels, role labels, task state labels, connection labels, and copied-invite feedback to `$localize` with stable custom ids.
- [x] 4.3 Keep participant-entered room names, display names, task titles, task details, room codes, task ids, round ids, participant ids, and estimate card labels unmodified by localization.
- [x] 4.4 Extract messages and populate initial `pt-BR` and `es-ES` translations with concise product copy that fits compact controls.

## 5. Accessible Feedback

- [x] 5.1 Localize skip links, header and region labels, form descriptions, ARIA labels, ARIA descriptions, and screen-reader-only status text.
- [x] 5.2 Localize live-region announcements for create, join, resume, disconnect, reconnect, task add/select, vote save, reveal, reset, save estimate, and complete estimation events.
- [x] 5.3 Ensure focus targets after dialogs, errors, reveal results, and final-estimate decisions expose localized accessible names and visible focus states.
- [x] 5.4 Add component tests for meaningful localized announcements without passive heartbeat announcements.

## 6. Validation and Error Presentation

- [x] 6.1 Change client validation helpers to return stable validation codes and parameters instead of primary English display strings.
- [x] 6.2 Add localized validation message helpers for room name, display name, room code, task title, task details, and numeric limit parameters.
- [x] 6.3 Add localized `RoomErrorCode` message helpers for room, task, vote, reveal, reset, final estimate, completion, recovery, duplicate join, and connection failures.
- [x] 6.4 Update room, session, and task presentation code to display localized code mappings for known errors and use backend message text only for unknown-code diagnostics or fallback.
- [x] 6.5 Add tests covering every known validation code, every known `RoomErrorCode`, unknown error fallback, and safe named-parameter interpolation.

## 7. Locale-Aware Formatting

- [x] 7.1 Move estimate formatting behind a shared helper that preserves deck card labels and formats computed averages and totals with the active locale.
- [x] 7.2 Format app-owned timestamps through Angular or Intl locale-aware APIs where timestamps are shown.
- [x] 7.3 Add tests for `1.5` average formatting, completed total formatting, unestimated/open values, and unchanged estimate card values across `pt-BR`, `en-US`, and `es-ES`.

## 8. Routing, Invites, and Recovery

- [x] 8.1 Keep copied invite links locale-neutral while preserving room code identity and existing `/rooms/:roomCode` invite compatibility.
- [x] 8.2 Ensure locale changes inside an active room preserve the room route and recover the authoritative room snapshot through existing locale-independent recovery anchors.
- [x] 8.3 Ensure refresh, reconnect, duplicate join recovery, invalid invite handling, and resume failure retain the resolved locale and localized feedback.
- [x] 8.4 Add focused route and room workflow tests for localized links, locale-neutral links, active-room locale changes, refresh recovery, reconnect recovery, and invalid resume fallback.

## 9. Backend Error-Code Contract

- [x] 9.1 Audit ASP.NET Core room and SignalR failures for English-only user-facing paths and add stable error codes where needed without adding locale to requests or room state.
- [x] 9.2 Keep backend `RoomErrorDto.Message` as diagnostics or fallback text and prevent Angular known-code paths from depending on it as normal visible UI copy.
- [x] 9.3 Update API tests to cover any new or clarified error codes for room, task, vote, reveal, reset, final estimate, completion, and recovery failures.

## 10. Coverage, Documentation, and Verification

- [x] 10.1 Add or update translation coverage checks so stale or untranslated `pt-BR` and `es-ES` entries are reported while display fallback remains source `en-US`.
- [x] 10.2 Run a language-specific product-copy review for `pt-BR` and `es-ES`, updating translation files without translating participant-provided content.
- [x] 10.3 Check Impeccable skill applicability before frontend QA and use the installed Impeccable workflow for UI/browser verification when it applies.
- [x] 10.4 Update `README.md` with localization setup, scripts, localized route behavior, translation maintenance, and verification steps.
- [x] 10.5 Run `npm test`, `npm run build` for all locale variants, `npm run test:api`, and any added extraction or translation coverage checks.
- [x] 10.6 Start the app and verify create, join, invite copy, refresh, reconnect, vote, reveal, save final estimate, and completion flows at desktop and mobile widths for `pt-BR`, `en-US`, and `es-ES`.
