# CoffeePlanningPoker

CoffeePlanningPoker is the collaborative estimation context for teams running live planning poker sessions. The language below names the shared room, task, voting, and estimate concepts used across the product.

## Language

### Rooms and people

**Room**:
A live collaboration space where one team estimates planning tasks together.
_Avoid_: Session room, meeting, lobby

**Room Code**:
A short human-readable code used to join a room.
_Avoid_: Join code, invite code, room id

**Invite Link**:
A shareable URL that opens a specific room for joining.
_Avoid_: Share link, room URL, invitation URL

**Participant**:
A person who has joined a room and can take part in estimation.
_Avoid_: Player, user, member

**Facilitator**:
The participant responsible for steering the room by selecting tasks, revealing votes, saving final estimates, and completing estimation.
_Avoid_: Host, moderator, owner

**Display Name**:
The name shown for a participant inside a room.
_Avoid_: Username, nickname, account name

**Presence**:
The visible availability state of a participant in a room, such as connected, reconnecting, disconnected, or left.
_Avoid_: Online status, connection status, availability

### Tasks and estimates

**Planning Task**:
A unit of work that the team intends to estimate during a room.
_Avoid_: Story, ticket, item, backlog item

**Backlog Queue**:
The ordered set of planning tasks available in the room.
_Avoid_: Task list, backlog, queue

**Active Task**:
The planning task currently selected for estimation.
_Avoid_: Current task, selected task, task in focus

**Final Estimate**:
The estimate saved for a planning task after votes are revealed and the team accepts the result.
_Avoid_: Agreed estimate, accepted estimate, saved estimate

**Completed Total Estimate**:
The total of saved final estimates when room estimation is completed.
_Avoid_: Project estimate, total estimate, final total

**Archived Estimate Total**:
The retained total for older saved estimates that are no longer shown as individual completed rounds.
_Avoid_: Hidden total, rolled-up estimate, historical total

### Voting workflow

**Planning Session**:
The estimation workflow inside a room, including its tasks, active round, completed rounds, and completion state.
_Avoid_: Estimation session, game, workflow

**Planning Round**:
One voting cycle for a single planning task.
_Avoid_: Round, vote round, estimation round

**Estimate Card**:
One selectable planning poker value used to cast a vote.
_Avoid_: Card, point card, vote option

**Discussion Card**:
The `?` estimate card, used when a participant is signaling uncertainty or a need for discussion rather than a numeric estimate.
_Avoid_: Question mark, unknown, unsure

**Participant Vote**:
A participant's hidden estimate selection for the active planning round.
_Avoid_: Vote, ballot, answer

**Reveal**:
The moment when hidden participant votes become visible for the active planning round.
_Avoid_: Show votes, flip cards, uncover

**Computed Average**:
The numeric average calculated from revealed participant votes, excluding discussion cards.
_Avoid_: Suggested estimate, average, consensus

**Re-vote**:
A new planning round for the same active task after the team decides the revealed votes need another pass.
_Avoid_: Reset, redo, vote again

**Completed Round**:
A planning round whose final estimate has been saved or whose estimation cycle has otherwise been closed.
_Avoid_: Closed round, archived round, previous round
