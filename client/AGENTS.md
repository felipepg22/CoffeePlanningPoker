# Client instructions

## Scope

These instructions apply to the Angular 21 application in `client/`. Use the
repository root instructions as well.

## Product and UI

- Read `PRODUCT.md` and `DESIGN.md` in this directory before changing product UI.
- Build usable room workflow, never a marketing landing page. Keep copy concise,
  task-focused, and suitable for a live team session.
- Prioritize creating or joining a room, task selection, hidden voting, Reveal,
  discussion, and final estimates; preserve clear room state and refresh or
  reconnect recovery.
- Preserve the warm coffee-room personality without casino cues, toy-like clutter,
  generic SaaS hero composition, decorative card grids, or dark dashboard gloom.
- Use cards only for participants, estimate cards, planning tasks, dialogs, and
  repeated list items; keep the resting layout calm, dense, and readable.
- Use real controls for actions: icon buttons for common tools, tabs for views,
  toggles for binary settings, menus for option sets, and dialogs for focused
  decisions.
- Use semantic controls, WCAG AA contrast, visible focus states, keyboard support,
  reduced-motion support, and layouts that prevent text or control overflow at
  desktop and mobile widths.
- Verify UI changes in a browser at desktop and mobile widths when a dev server
  can run.
- After Angular UI code exists, run `/impeccable document` to replace the seed
  design system with extracted tokens and component patterns.

## Architecture

- Use standalone components, strict TypeScript, and modern Angular control flow.
- Prefer signals for local reactive state; use RxJS at stream boundaries such as
  SignalR, HTTP, timers, and router events.
- Keep components small and feature-oriented. Use reactive forms for complex
  inputs and simple template bindings only for small local controls.
- Keep room creation, joining, membership, and presence in `rooms`; estimation,
  voting, reveal, and rounds in `session`; planning tasks and final estimates in
  `tasks`; lightweight preferences in `identity`; put code in `shared/` only when
  it has real reuse.
- Keep planning-poker rules near their owning feature. Model room, round, card,
  vote, and participant state with explicit TypeScript types.
- Use explicit names such as `PlanningRound`, `EstimateCard`, `ParticipantVote`,
  and `RoomSession`; avoid premature abstractions and comment only non-obvious
  decisions or domain rules.
- Do not add broad state-management libraries unless services plus signals have
  demonstrably become insufficient.

## Localisation and validation

- Preserve runtime locale switching for `en-US`, `pt-BR`, and `es-ES`; update the
  XLIFF catalogs under `src/locale/` when changing translated UI messages.
- Add focused Vitest coverage for domain rules, voting transitions, services, and
  important component interactions. Prefer deterministic tests.
- From `client/`, run `npm run i18n:check`, `npm test`, and `npm run build` for
  relevant client changes.
