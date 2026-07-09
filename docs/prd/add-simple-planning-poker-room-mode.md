# Add Simple Planning Poker Room Mode

## Problem Statement

Teams sometimes need a focused Planning Poker Room for repeated, ad hoc votes
without managing a Backlog Queue or saving a Final Estimate for each Planning
Task. Today every Planning Round is coupled to an Active Task, so facilitators
cannot begin a lightweight voting-only Room or replace a revealed result with a
fresh round without using the task-estimation workflow.

## Solution

Let a Facilitator choose a permanent Room mode when creating a Room:

- **Task estimation** remains the default and preserves the existing workflow.
- **Simple planning poker** starts a taskless Planning Round immediately.
  Participants cast Participant Votes with the existing Estimate Cards, the
  Facilitator performs Reveal, and the Facilitator can immediately start a
  fresh Planning Round after Reveal.

Simple planning poker makes the mode clear to every Participant, removes the
Backlog Queue from the interface, never records Final Estimates or totals, and
enforces those restrictions at the realtime server boundary as well as in the
client.

## User Stories

1. As a Facilitator, I want to choose Task estimation or Simple planning poker
   when creating a Room, so that I can match the Room to the meeting I am
   running.
2. As a Facilitator, I want Task estimation to remain selected by default, so
   that my existing planning workflow is unchanged unless I deliberately choose
   a simpler format.
3. As a Facilitator, I want the Room mode to be fixed when I create the Room,
   so that every Participant has a predictable shared workflow.
4. As a Facilitator, I want a Simple planning poker Room to begin its first
   Planning Round immediately, so that Participants can vote as soon as they
   join.
5. As a Participant, I want to see that a Room uses Simple planning poker, so
   that I understand why the Backlog Queue and task controls are absent.
6. As a Participant, I want to join an active Simple planning poker Room and
   cast a Participant Vote immediately, so that I can participate without
   waiting for setup.
7. As a Participant, I want to use the same Estimate Cards in either Room
   mode, so that the voting convention remains familiar.
8. As a Participant, I want my Participant Vote to remain hidden until Reveal,
   so that I can estimate independently.
9. As a Facilitator, I want Reveal disabled until at least one Participant Vote
   exists, so that the Room cannot reveal an empty result.
10. As a Facilitator, I want to Reveal Simple planning poker votes using the
    existing facilitator control, so that the team can discuss the result
    together.
11. As a Participant, I want a revealed Simple planning poker result to show
    each Participant Vote, the Computed Average, and the numeric range, so that
    I can understand the outcome.
12. As a Participant, I want a revealed result containing only Discussion Cards
    to clearly show that there is no numeric estimate, so that the team
    recognizes the need for discussion.
13. As a Facilitator, I want to start a new Simple planning poker Planning Round
    after Reveal, including after a Discussion Card-only result, so that the
    team can move to the next ad hoc estimate.
14. As a Facilitator, I want Start new round disabled before Reveal, so that
    unrevealed Participant Votes cannot be discarded accidentally.
15. As a Facilitator, I want Start new round to take effect immediately after
    Reveal, so that a live session stays quick and does not require a
    confirmation dialog.
16. As a Participant, I want a new Simple planning poker Planning Round to
    replace the previous revealed result completely, so that the Room stays
    focused on the current vote.
17. As a Participant, I do not want Simple planning poker to display a round
    number or prior-round history, so that the lightweight workflow does not
    imply task tracking.
18. As a Participant who joins after Reveal, I want to see the revealed result
    but wait for the next Planning Round before voting, so that the result
    cannot be altered retrospectively.
19. As a Facilitator, I do not want task creation, task selection, Final
    Estimate saving, or estimation completion available in Simple planning
    poker, so that the Room remains taskless.
20. As a Facilitator, I want task-only operations rejected by the realtime
    server for Simple planning poker Rooms, so that clients cannot bypass the
    product rules.
21. As a team using Task estimation, I want its Backlog Queue, Re-vote, Final
    Estimate, and completion behavior to remain unchanged, so that adding
    Simple planning poker does not regress the existing workflow.
22. As a Participant, I want Room recovery and Presence behavior to continue
    working in Simple planning poker, so that a refresh or reconnect does not
    interrupt the live session.

## Implementation Decisions

- Introduce a Room mode with two values: Task estimation and Simple planning
  poker. The chosen mode is provided at Room creation, persisted in Room state,
  and returned in every Room snapshot so all connected and recovering clients
  render the same workflow.
- Task estimation is the default for newly created Rooms. Existing Task
  estimation behavior remains the compatibility baseline.
- A Simple planning poker Room creates an active, taskless Planning Round at
  Room creation. This extends the domain language: the current definition of
  Planning Round is task-scoped, so the implementation must distinguish a
  taskless Simple planning poker Planning Round from a Planning Round for an
  Active Task rather than using a fabricated Planning Task.
- Model the Simple planning poker transition as a separate taskless action at
  the Room gateway boundary. It is facilitator-authorized, requires an active
  revealed Simple planning poker Planning Round, closes and discards that
  result, and creates a new active voting round. It must not accept or derive a
  Planning Task identifier.
- The realtime server is the authority for Room-mode rules. For Simple planning
  poker, it rejects operations that add or select a Planning Task, start a
  task-oriented Re-vote or next round, save a Final Estimate, or complete
  estimation. It also rejects starting a new Simple planning poker round before
  Reveal.
- The Room snapshot and client Room gateway contract expose the mode and the
  taskless active Planning Round without weakening type safety for Task
  estimation.
- The creation UI adds an explicit Session type choice with Task estimation and
  Simple planning poker. Task estimation is selected initially.
- The Simple planning poker UI shows a small non-interactive mode label in the
  Room header. It removes the Backlog Queue panel, task search, task selection,
  task creation, task-only stage metadata, Re-vote, Final Estimate saving,
  total displays, and Complete estimation.
- Simple planning poker reuses the existing Estimate Cards, voting progress,
  hidden vote behavior, Reveal behavior, Participant Presence, Computed
  Average, numeric range, and Discussion Card result messaging.
- In Simple planning poker, Reveal stays disabled until at least one Participant
  Vote exists. After Reveal, Start new round is the sole reset action, is
  available only to the Facilitator, has no confirmation dialog, and clears the
  previous result with no displayed or retained round history.
- A Participant joining while a Simple planning poker round is voting is
  included in that round and may vote. A Participant joining after Reveal sees
  the immutable result and participates from the next round.
- Add all new visible copy and Room-mode error messages to the supported runtime
  locales. Preserve keyboard access, visible focus states, accessible labels,
  and responsive layout when the task panel is removed.
- Update the project README because this is a significant user-facing workflow
  and capability change.

## Testing Decisions

- Tests must assert externally observable Room behavior and rendered controls
  rather than private signals, internal collections, or implementation-specific
  method calls.
- The primary authoritative seam is the in-memory Room Store, following the
  existing Room-state test style. It should cover creating each Room mode,
  immediate taskless round creation, Participant voting and hidden/revealed
  snapshots, Computed Average handling, Discussion Card-only results,
  Facilitator authorization, transition to a fresh round, late joining, and
  recovery-compatible snapshots.
- The Room Store tests must prove server enforcement: Simple planning poker
  rejects all task-only and completion actions, rejects new-round requests
  before Reveal, and leaves the active result intact after rejected actions.
- A focused Room-workflow component test supplements the state seam. It should
  verify the selected Session type reaches Room creation and that Simple
  planning poker renders the mode label and voting workflow while omitting the
  Backlog Queue and task-only controls. It should also verify Reveal and Start
  new round enabled states.
- Extend the existing client service and Room gateway test doubles only as
  needed to validate the new creation command, snapshot mode, and Simple
  planning poker new-round command.
- Extend the existing localization coverage to ensure every new key is
  translated in all supported locales.
- Existing Task estimation test cases remain regression coverage and must
  continue to pass unchanged in behavior.

## Out of Scope

- Switching a Room between Task estimation and Simple planning poker after
  creation.
- Configuring a separate Estimate Card deck for Simple planning poker.
- Saving, exporting, restoring, or showing Simple planning poker round history.
- Displaying a round number or retaining a total for Simple planning poker.
- Adding task operations, Final Estimates, Re-votes, completion, or project
  totals to Simple planning poker.
- Confirmation dialogs before starting a new Simple planning poker round.
- Changes to Room Code, Invite Link, Presence, authentication, persistence
  lifetime, or deployment architecture beyond carrying the new mode through the
  existing Room flow.

## Further Notes

- The design deliberately separates a taskless Simple planning poker Planning
  Round from a task-oriented Planning Round. The domain glossary should be
  updated during implementation so the term remains precise.
- The taskless round must be represented explicitly through the Room contracts
  rather than by introducing a hidden placeholder Planning Task.
- No visual round counter is required. The Room should stay focused on the
  current live vote.
- The capability is intended for live collaboration: speed, clear shared state,
  keyboard accessibility, reconnect tolerance, and server-authoritative
  transitions take precedence over history or reporting.
