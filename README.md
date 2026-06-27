# CoffeePlanningPoker

![Angular](https://img.shields.io/badge/Angular-21-dd0031?logo=angular&logoColor=white)
![SignalR](https://img.shields.io/badge/SignalR-realtime-512bd4?logo=dotnet&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-0f766e)

CoffeePlanningPoker is a live planning poker app for teams estimating work together.
It starts directly in the room workflow: create or join a room, add tasks, vote with
estimate cards, reveal the spread, discuss, and save the final estimate.

```text
      )  (
     (   ) )
      ) ( (
   .--------.        Create room     Vote hidden     Reveal     Save
   | coffee |  -->   Invite team --> Estimate --> Discuss --> Estimate
   `--------'
```

## What It Does

- Create a room with a readable invite code and shareable room link.
- Join an existing room by code or invite URL.
- Keep participant presence visible during live sessions.
- Recover a room after refresh with a locally stored resume token.
- Add and select tasks from a compact backlog queue.
- Vote with Fibonacci-style estimate cards: `0`, `1`, `2`, `3`, `5`, `8`, `13`, `21`, `?`.
- Reveal votes only when the facilitator is ready.
- Highlight large estimate spreads so the team knows when to discuss.
- Save the agreed estimate back to the active task.
- Use the app in `en-US`, `pt-BR`, or `es-ES` without translating participant-entered room, task, or vote data.

## Product Shape

The app is designed as a focused collaboration tool, not a marketing page or casino
table. The visual direction is warm and coffee-room flavored, while the interface
stays dense, readable, and fast for repeated team sessions.

The live room uses a three-pane session layout: tasks on the left, the active
voting round in the center, and participants on the right. On smaller screens the
same workflow stacks into task, voting, and participant sections without changing
the room actions.

```mermaid
flowchart LR
  A["Create or join room"] --> B["Add or select task"]
  B --> C["Pick estimate card"]
  C --> D["Reveal votes"]
  D --> E{"Spread is large?"}
  E -- "Yes" --> F["Discuss high and low estimates"]
  E -- "No" --> G["Confirm consensus"]
  F --> H["Save final estimate"]
  G --> H
  H --> I["Start next round"]
```

## Architecture

```mermaid
flowchart TB
  Browser["Angular 21 app"]
  Workflow["Room workflow component"]
  RoomService["RoomService signals"]
  Gateway["SignalRRoomGateway"]
  Hub["ASP.NET Core SignalR RoomHub"]
  Store["InMemoryRoomStore"]
  Persistence["Local recovery anchor"]

  Browser --> Workflow
  Workflow --> RoomService
  RoomService --> Gateway
  RoomService --> Persistence
  Gateway <-->|"WebSocket / SignalR"| Hub
  Hub --> Store
```

## Tech Stack

- Frontend: Angular 21, standalone components, strict TypeScript, signals, RxJS.
- Realtime boundary: `@microsoft/signalr`.
- Backend: ASP.NET Core SignalR API with an in-memory room store.
- Tests: Vitest for Angular unit tests and `dotnet test` for API tests.

## Project Structure

```text
src/
  app/
    identity/       Display-name and participant identity state
    rooms/          Room workflow, validation, persistence, SignalR gateway
    shared/i18n/    Locale resolution, selector, formatting, and message helpers
  locale/           Angular XLIFF translation resources
server/
  CoffeePlanningPoker.Api/        SignalR room API
  CoffeePlanningPoker.Api.Tests/  API unit tests
PRODUCT.md         Product register and principles
DESIGN.md          Starter visual direction
```

## Requirements

- Node.js `^20.19.0`, `^22.12.0`, or `>=24.0.0`
- npm
- .NET SDK compatible with the API project

## Getting Started

Install dependencies:

```bash
npm install
```

Start the realtime API:

```bash
npm run api
```

In a second terminal, start the Angular app:

```bash
npm start
```

Open the app at:

```text
http://localhost:4200
```

Static session layout proof-of-concepts are available without the API at:

```text
http://localhost:4200/layout-poc
```

Localized dev variants are available with:

```bash
npm run start:locales
npm run start:en-US
npm run start:pt-BR
npm run start:es-ES
```

Use `npm run start:locales` when testing the language selector locally. It starts
`pt-BR` on port `4200`, `es-ES` on port `4201`, and `en-US` on port `4202`, so
the flag controls can reload the matching localized app variant.

The Angular app expects the SignalR hub at:

```text
http://localhost:5050/hubs/rooms
```

## Useful Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Run the Angular dev server. |
| `npm run start:locales` | Run all localized app variants for local language switching. |
| `npm run start:en-US` | Run the English localized app variant on port `4202`. |
| `npm run start:pt-BR` | Run the Brazilian Portuguese localized app variant on port `4200`. |
| `npm run start:es-ES` | Run the Spanish localized app variant on port `4201`. |
| `npm run api` | Run the ASP.NET Core SignalR API on port `5050`. |
| `npm run build` | Build the Angular app for production. |
| `npm run build:locales` | Build all configured locale variants. |
| `npm run extract:i18n` | Extract Angular source messages to `src/locale/messages.en-US.xlf`. |
| `npm run i18n:check` | Check `pt-BR` and `es-ES` translation coverage against the source file. |
| `npm test` | Run Angular unit tests with Vitest. |
| `npm run test:api` | Run .NET API tests. |
| `npm run watch` | Build Angular continuously in development mode. |

## Localization

The source locale is `en-US`. Localized routes use `/<locale>` prefixes, for
example `/en-US`, `/pt-BR`, `/es-ES`, and `/pt-BR/rooms/brew-482`. Existing
locale-neutral invite links such as `/rooms/brew-482` remain valid; the app
resolves the active locale from the URL, stored `coffee-planning-poker.locale`
preference, browser languages, then `en-US`.

Angular localization is compiled per locale, so switching language reloads the
matching localized app variant. In production, serve the `build:locales` output
from one origin. In local development, use `npm run start:locales`; a single
`ng serve --configuration <locale>` process only serves that one language.

Invite links copied from an active room remain locale-neutral so recipients can
join with their own language preference. Room names, display names, task titles,
task notes, room codes, participant ids, round ids, and estimate card labels are
shared room data and are not translated.

When copy changes, update translations with:

```bash
npm run extract:i18n
npm run i18n:check
npm run build:locales
```

`messages.pt-BR.xlf` and `messages.es-ES.xlf` should keep concise product copy
that fits compact controls. Missing display translations fall back to source
English at build time, while `npm run i18n:check` reports missing or unfinished
target entries for review.

## Development Notes

- Keep room, voting, participant, and recovery rules close to the feature that owns them.
- Use Angular signals for local UI state and RxJS for realtime, HTTP, router, and timer boundaries.
- Treat the backend, realtime gateway, and persistence APIs as replaceable boundaries.
- Preserve accessible controls, visible focus states, and layouts that do not overflow on mobile.
- Keep UI copy short and action-focused.

## Quality Checks

Before finishing functional changes, run the relevant checks:

```bash
npm test
npm run build
npm run build:locales
npm run i18n:check
npm run test:api
```

For frontend changes, also verify the room workflow in a browser at desktop and
mobile widths.

## License

MIT License. See [LICENSE](LICENSE).
