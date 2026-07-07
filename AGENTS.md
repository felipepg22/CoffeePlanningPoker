# AGENTS.md

## Project

This repository is for an Angular 21 planning poker app used by teams to estimate
tasks collaboratively.

## Product Direction

- Build the first screen as the usable app, not a marketing landing page.
- Core workflow: create or join a room, add tasks, vote with estimate cards,
  reveal votes, discuss, and save the final estimate.
- Optimize for live team sessions: clear state, fast interactions, accessible
  controls, and predictable recovery after refresh or reconnect.
- Keep UI text concise and task-focused. Avoid instructional copy unless the
  user is blocked without it.

## Tech Expectations

- Use Angular 21 with standalone components, strict TypeScript, and modern
  Angular control flow.
- Prefer signals for local reactive state. Use RxJS where streams are the
  natural API boundary, such as sockets, HTTP, timers, and router events.
- Keep components small and feature-oriented. Put shared UI in `shared/` only
  when there is real reuse.
- Use Angular forms deliberately: reactive forms for complex inputs, template
  bindings only for simple local controls.
- Do not add broad state-management libraries unless the app has outgrown
  services plus signals.

## Architecture

- Suggested feature areas:
  - `rooms`: room creation, joining, membership, presence.
  - `session`: estimation flow, voting, reveal, rounds.
  - `tasks`: backlog/task list, task selection, final estimate.
  - `identity`: display name, avatar/color, lightweight preferences.
  - `shared`: reusable UI primitives, pipes, directives, utilities.
- Keep domain rules close to the feature that owns them. Avoid scattering
  planning poker rules across components.
- Model estimation cards, voting state, participants, and rounds with explicit
  TypeScript types.
- Treat backend, realtime, and persistence APIs as replaceable boundaries behind
  Angular services.

## UI Standards

- The interface should feel like a focused collaboration tool: dense enough for
  repeated use, calm, readable, and responsive.
- Use real controls for app actions: icon buttons for common tools, tabs for
  views, toggles for binary settings, menus for option sets, and dialogs for
  focused decisions.
- Avoid decorative card-heavy layouts. Cards are appropriate for players,
  estimate cards, tasks, dialogs, and repeated list items.
- Ensure text never overlaps or overflows buttons/cards on mobile or desktop.
- Support keyboard navigation and visible focus states for voting and room flow.

## Design Context

- Read `PRODUCT.md` before design work; it captures the default `product`
  register, users, purpose, brand personality, anti-references, design
  principles, and accessibility baseline.
- Read `DESIGN.md` for the starter visual direction. Re-run
  `/impeccable document` after Angular UI code exists to replace the seed with
  extracted tokens and component patterns.

## Quality Bar

- Run formatting, linting, unit tests, and build checks before finishing changes
  when the project scripts exist.
- Add focused tests for domain rules, voting transitions, room/session services,
  and important component interactions.
- Prefer deterministic tests over timer-heavy or brittle DOM assertions.
- For frontend changes, verify the app in a browser at desktop and mobile widths
  when a dev server can run.

## Code Style

- Follow the existing project conventions once files exist.
- Keep names explicit: `PlanningRound`, `EstimateCard`, `ParticipantVote`,
  `RoomSession`, and similar domain names are preferred over vague names.
- Avoid premature abstractions. Extract helpers only after the duplication or
  complexity is visible.
- Use concise comments only to explain non-obvious decisions or domain rules.
- Keep files ASCII unless a file already uses another character set.

## Collaboration Notes

- Preserve user changes. Do not reset, revert, or overwrite unrelated work.
- Keep changes scoped to the requested feature or fix.
- Update `README.md` whenever a significant app change affects setup, scripts,
  architecture, workflows, capabilities, product behavior, or verification steps.
- If requirements are ambiguous, make the smallest reasonable assumption and
  document it in the final response.
- If adding dependencies, explain why they are needed and prefer established
  Angular ecosystem packages.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `felipepg22/CoffeePlanningPoker`; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-role triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain-doc layout: root `CONTEXT.md` plus `docs/adr/`. See `docs/agents/domain.md`.
