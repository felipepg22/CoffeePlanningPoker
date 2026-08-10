# Repository instructions

## Scope

CoffeePlanningPoker is a live, collaborative planning-poker application. The
repository contains an Angular client in `client/` and an ASP.NET Core SignalR
API in `server/`.

Preserve unrelated user changes, keep work scoped to the request, and do not add
dependencies without a specific need and an explanation. Update `README.md` when
a significant change affects setup, scripts, architecture, workflows, product
behavior, capabilities, or verification.
When requirements are ambiguous, make the smallest reasonable assumption and
record it in the final handoff.

## Essential workflow

- For client changes, work from `client/` and use the commands declared in
  `client/package.json`: `npm run i18n:check`, `npm test`, and `npm run build`.
- For API changes, run `dotnet restore CoffeePlanningPoker.slnx`, then
  `dotnet build CoffeePlanningPoker.slnx --configuration Release --no-restore`
  and `dotnet test CoffeePlanningPoker.slnx --configuration Release --no-build`.
- Run the relevant checks before finishing. No formatter or linter command is
  currently configured; do not invent one.

## Task routes

- Before changing files under `client/`, read `client/AGENTS.md`.
- Before changing files under `server/`, read `server/AGENTS.md`.
- Before UI or product-design work, read `PRODUCT.md` and `DESIGN.md`.
- Before changing domain concepts, rules, or invariants, read `CONTEXT.md` and
  relevant ADRs in `docs/adr/`; follow `docs/agents/domain.md`. If those domain
  files are absent, proceed without creating them unless the work resolves a
  domain decision.
- For OpenSpec work, follow `openspec/config.yaml` and the active change/specs.
- For GitHub issue or PRD work, follow `docs/agents/issue-tracker.md`; use the
  labels mapped in `docs/agents/triage-labels.md`.

## Critical constraints

- Use the vocabulary in `CONTEXT.md`; do not substitute terms it marks as avoided.
- Keep files ASCII unless the file already uses another character set.
- Treat backend, realtime, and persistence APIs as replaceable boundaries.
