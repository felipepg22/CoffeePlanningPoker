# Simple Planning Poker Room Mode: Issue Breakdown

Source: [PRD](../prd/add-simple-planning-poker-room-mode.md)

## 1. Create and reveal a Simple planning poker Room

## What to build

Deliver the first complete Simple planning poker workflow. A Facilitator can
choose Simple planning poker when creating a Room; the Room immediately opens a
taskless Planning Round that Participants can join, vote in, and Reveal. The
Room visibly identifies its mode, omits all Backlog Queue and task-estimation
controls, and preserves the existing Task estimation workflow as the default.

The Room state and realtime contract must carry the permanent Room mode and an
explicit taskless Planning Round. The realtime server must enforce Simple
planning poker boundaries so task creation and selection, task-oriented Re-vote
or next-round actions, Final Estimate saving, and completion cannot be invoked
by a client.

## Acceptance criteria

- [ ] Room creation offers Task estimation and Simple planning poker, defaults
  to Task estimation, and returns the chosen immutable mode in Room snapshots.
- [ ] A new Simple planning poker Room has an immediately active, taskless
  voting Planning Round; Participants can join it, cast hidden Participant
  Votes using the existing Estimate Cards, and the Facilitator can Reveal once
  at least one vote exists.
- [ ] Revealed Simple planning poker results show Participant Votes, Computed
  Average, numeric range, and the existing no-numeric-result message for
  Discussion Card-only votes.
- [ ] Simple planning poker renders an accessible mode label and voting workflow
  without a Backlog Queue, task creation or selection, task-oriented metadata,
  Re-vote, Final Estimate, totals, or completion controls.
- [ ] The realtime server rejects task-only and completion operations for Simple
  planning poker without changing the Room's active state.
- [ ] Existing Task estimation behavior remains unchanged, and new user-facing
  copy is available in all supported locales.

## Blocked by

None - can start immediately.

---

## 2. Start replacement rounds in Simple planning poker

## What to build

Let the Facilitator start a fresh Simple planning poker Planning Round after
Reveal. The action replaces the previous revealed result immediately, without a
round history or counter, and lets the next live vote begin. It must work after
numeric and Discussion Card-only results, remain unavailable before Reveal, and
preserve the revealed result for Participants who join before the next round.

The Room gateway and realtime server must make this a facilitator-only,
taskless transition and reject premature or task-oriented reset attempts.

## Acceptance criteria

- [ ] After a Simple planning poker Reveal, only the Facilitator can use Start
  new round; it immediately creates a clean taskless voting Planning Round with
  no confirmation dialog.
- [ ] Start new round is unavailable before Reveal, and the realtime server
  rejects an attempted transition before Reveal without discarding hidden
  Participant Votes.
- [ ] Start new round works after both numeric and Discussion Card-only results,
  clears the previous result, and does not display or retain a round number or
  history.
- [ ] A Participant joining after Reveal can see the immutable revealed result
  but cannot vote until the Facilitator starts the next Planning Round.
- [ ] The transition remains taskless: it does not accept a Planning Task, does
  not create a Final Estimate, and does not alter Task estimation behavior.
- [ ] Focused Room Store and Room-workflow tests cover the transition, its
  authorization and guard conditions, and the visible enabled states.

## Blocked by

1. Create and reveal a Simple planning poker Room.
