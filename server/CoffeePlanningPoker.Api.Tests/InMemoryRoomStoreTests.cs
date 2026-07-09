using CoffeePlanningPoker.Api.Rooms;

namespace CoffeePlanningPoker.Api.Tests;

public sealed class InMemoryRoomStoreTests
{
    [Fact]
    public void CreateRoomCreatesFacilitatorWithResumeToken()
    {
        var store = CreateStore();

        var result = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");

        Assert.True(result.Success);
        Assert.NotNull(result.Snapshot);
        Assert.StartsWith("BREW-", result.Snapshot.RoomCode);
        Assert.Equal("Sprint planning", result.Snapshot.RoomName);
        Assert.Equal("p-1", result.Snapshot.LocalParticipantId);
        Assert.False(string.IsNullOrWhiteSpace(result.Snapshot.ResumeToken));
        var facilitator = Assert.Single(result.Snapshot.Participants);
        Assert.Equal(ParticipantRoles.Facilitator, facilitator.Role);
        Assert.Equal(ParticipantPresence.Connected, facilitator.Presence);
    }

    [Fact]
    public void JoinRoomAddsParticipantWithSameRoomState()
    {
        var store = CreateStore();
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");

        var joined = store.JoinRoom(new JoinRoomRequest(created.Snapshot!.RoomCode, "p-2", "Sam"), "c-2");

        Assert.True(joined.Success);
        Assert.Equal(RoomEvents.ParticipantJoined, joined.Event);
        Assert.Equal(created.Snapshot.RoomCode, joined.Snapshot!.RoomCode);
        Assert.Equal(2, joined.Snapshot.Participants.Count);
    }

    [Fact]
    public void SameParticipantRejoinDoesNotDuplicateParticipant()
    {
        var store = CreateStore();
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");
        store.JoinRoom(new JoinRoomRequest(created.Snapshot!.RoomCode, "p-2", "Sam"), "c-2");

        var joinedAgain = store.JoinRoom(new JoinRoomRequest(created.Snapshot.RoomCode, "p-2", "Samuel"), "c-3");

        Assert.True(joinedAgain.Success);
        Assert.Equal(RoomEvents.PresenceChanged, joinedAgain.Event);
        Assert.Equal(2, joinedAgain.Snapshot!.Participants.Count);
        Assert.Contains(joinedAgain.Snapshot.Participants, participant => participant.ParticipantId == "p-2" && participant.DisplayName == "Samuel");
    }

    [Fact]
    public void SameDisplayNameWithDifferentIdsCreatesSeparateParticipants()
    {
        var store = CreateStore();
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");

        store.JoinRoom(new JoinRoomRequest(created.Snapshot!.RoomCode, "p-2", "Alex"), "c-2");
        var secondAlex = store.JoinRoom(new JoinRoomRequest(created.Snapshot.RoomCode, "p-3", "Alex"), "c-3");

        Assert.True(secondAlex.Success);
        Assert.Equal(3, secondAlex.Snapshot!.Participants.Count);
        Assert.Equal(2, secondAlex.Snapshot.Participants.Count(participant => participant.DisplayName == "Alex"));
    }

    [Fact]
    public void InvalidRoomCodeIsRejected()
    {
        var store = CreateStore();

        var result = store.JoinRoom(new JoinRoomRequest("bad code!", "p-1", "Felipe"), "c-1");

        Assert.False(result.Success);
        Assert.Equal(RoomErrorCodes.InvalidRoomCode, result.Error!.Code);
    }

    [Fact]
    public void ExpiredRoomCannotBeJoined()
    {
        var clock = new ManualRoomClock();
        var store = CreateStore(clock);
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");

        clock.Advance(TimeSpan.FromHours(3));
        var removed = store.CleanupExpiredRooms();
        var joined = store.JoinRoom(new JoinRoomRequest(created.Snapshot!.RoomCode, "p-2", "Sam"), "c-2");

        Assert.Equal(1, removed);
        Assert.False(joined.Success);
        Assert.Equal(RoomErrorCodes.RoomUnavailable, joined.Error!.Code);
    }

    [Fact]
    public void ResumeWithBadTokenIsRejected()
    {
        var store = CreateStore();
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");

        var result = store.ResumeRoom(new ResumeRoomRequest(created.Snapshot!.RoomCode, "p-1", "wrong-token"), "c-2");

        Assert.False(result.Success);
        Assert.Equal(RoomErrorCodes.ResumeRejected, result.Error!.Code);
    }

    [Fact]
    public void ResumeWithValidTokenReconnectsParticipant()
    {
        var store = CreateStore();
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");
        store.MarkDisconnected("c-1");

        var result = store.ResumeRoom(new ResumeRoomRequest(created.Snapshot!.RoomCode, "p-1", created.Snapshot.ResumeToken), "c-2");

        Assert.True(result.Success);
        var participant = Assert.Single(result.Snapshot!.Participants);
        Assert.Equal(ParticipantPresence.Connected, participant.Presence);
    }

    [Fact]
    public void DisconnectMovesParticipantToReconnecting()
    {
        var store = CreateStore();
        store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");

        var participantEvent = store.MarkDisconnected("c-1");

        Assert.NotNull(participantEvent);
        Assert.Equal(ParticipantPresence.Reconnecting, participantEvent.Participant.Presence);
    }

    [Fact]
    public void LeaveMovesParticipantToLeft()
    {
        var store = CreateStore();
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");

        var left = store.LeaveRoom(new LeaveRoomRequest(created.Snapshot!.RoomCode, "p-1"), "c-1");

        Assert.True(left.Success);
        Assert.Equal(RoomEvents.ParticipantLeft, left.Event);
        Assert.Equal(ParticipantPresence.Left, left.Participant!.Presence);
    }

    [Fact]
    public void CreateRoomInitializesPlanningSession()
    {
        var store = CreateStore();

        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");

        Assert.True(created.Success);
        Assert.True(created.Snapshot!.SnapshotVersion > 0);
        Assert.NotNull(created.Snapshot.PlanningSession);
        Assert.Empty(created.Snapshot.PlanningSession!.Tasks);
        Assert.Null(created.Snapshot.PlanningSession.CurrentTaskId);
        Assert.Null(created.Snapshot.PlanningSession.ActiveRound);
        Assert.Equal(RoomEstimationStatuses.Active, created.Snapshot.PlanningSession.EstimationStatus);
        Assert.Equal(0, created.Snapshot.PlanningSession.ArchivedEstimateTotal);
    }

    [Fact]
    public void SimplePlanningPokerRoomStartsWithAnImmediateTasklessVotingRound()
    {
        var store = CreateStore();

        var defaultRoom = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");
        var created = store.CreateRoom(new CreateRoomRequest("Quick estimates", "p-2", "Sam", RoomModes.SimplePlanningPoker), "c-2");
        var planning = created.Snapshot!.PlanningSession!;

        Assert.Equal(RoomModes.TaskEstimation, defaultRoom.Snapshot!.RoomMode);
        Assert.Equal(RoomModes.SimplePlanningPoker, created.Snapshot.RoomMode);
        Assert.Empty(planning.Tasks);
        Assert.Null(planning.CurrentTaskId);
        Assert.NotNull(planning.ActiveRound);
        Assert.Null(planning.ActiveRound!.TaskId);
        Assert.Equal(PlanningRoundStatuses.Voting, planning.ActiveRound.Status);
        Assert.Empty(planning.CompletedRounds);
    }

    [Fact]
    public void SimplePlanningPokerHidesVotesThenRevealsNumericAverageAndDiscussionOnlyResult()
    {
        var store = CreateStore();
        var created = CreateSimpleRoom(store);
        var roundId = created.Snapshot!.PlanningSession!.ActiveRound!.RoundId;
        store.JoinRoom(new JoinRoomRequest(created.Snapshot.RoomCode, "p-2", "Sam"), "c-2");

        store.CastVote(new CastVoteRequest(created.Snapshot.RoomCode, "p-1", roundId, "1"));
        store.CastVote(new CastVoteRequest(created.Snapshot.RoomCode, "p-2", roundId, "2"));
        var preReveal = store.GetClientSnapshots(created.Snapshot.RoomCode).Single(snapshot => snapshot.ConnectionId == "c-1").Snapshot.PlanningSession!.ActiveRound!;
        var revealed = store.RevealVotes(new RevealVotesRequest(created.Snapshot.RoomCode, "p-1", roundId));

        Assert.Null(preReveal.Votes.Single(vote => vote.ParticipantId == "p-2").Estimate);
        Assert.True(revealed.Success);
        Assert.Equal(1.5m, revealed.Snapshot!.PlanningSession!.ActiveRound!.ComputedAverage);
        Assert.All(revealed.Snapshot.PlanningSession.ActiveRound.Votes, vote => Assert.NotNull(vote.Estimate));

        var next = store.StartSimplePlanningPokerRound(new StartSimplePlanningPokerRoundRequest(created.Snapshot.RoomCode, "p-1"));
        var discussionRoundId = next.Snapshot!.PlanningSession!.ActiveRound!.RoundId;
        store.CastVote(new CastVoteRequest(created.Snapshot.RoomCode, "p-1", discussionRoundId, "?"));
        var discussion = store.RevealVotes(new RevealVotesRequest(created.Snapshot.RoomCode, "p-1", discussionRoundId));

        Assert.True(discussion.Success);
        Assert.Null(discussion.Snapshot!.PlanningSession!.ActiveRound!.ComputedAverage);
    }

    [Fact]
    public void SimplePlanningPokerRejectsTaskOnlyOperationsWithoutChangingItsRound()
    {
        var store = CreateStore();
        var created = CreateSimpleRoom(store);
        var round = created.Snapshot!.PlanningSession!.ActiveRound!;
        store.CastVote(new CastVoteRequest(created.Snapshot.RoomCode, "p-1", round.RoundId, "5"));

        var results = new RoomCommandResult[]
        {
            store.AddTask(new AddTaskRequest(created.Snapshot.RoomCode, "p-1", "A task", null)),
            store.SelectTask(new SelectTaskRequest(created.Snapshot.RoomCode, "p-1", "task-1")),
            store.ResetRound(new ResetRoundRequest(created.Snapshot.RoomCode, "p-1", "task-1")),
            store.StartNextRound(new StartNextRoundRequest(created.Snapshot.RoomCode, "p-1", null)),
            store.SaveFinalEstimate(new SaveFinalEstimateRequest(created.Snapshot.RoomCode, "p-1", "task-1", round.RoundId)),
            store.CompleteEstimation(new CompleteEstimationRequest(created.Snapshot.RoomCode, "p-1")),
        };
        var snapshot = store.GetClientSnapshots(created.Snapshot.RoomCode).Single(snapshot => snapshot.ConnectionId == "c-1").Snapshot;

        Assert.All(results, result =>
        {
            Assert.False(result.Success);
            Assert.Equal(RoomErrorCodes.RoomModeRestricted, result.Error!.Code);
        });
        Assert.Empty(snapshot.PlanningSession!.Tasks);
        Assert.Equal(round.RoundId, snapshot.PlanningSession.ActiveRound!.RoundId);
        Assert.Equal(PlanningRoundStatuses.Voting, snapshot.PlanningSession.ActiveRound.Status);
        Assert.True(snapshot.PlanningSession.ActiveRound.Votes.Single().HasVoted);
    }

    [Fact]
    public void SimplePlanningPokerNewRoundRequiresRevealAndReplacesTheRevealedResult()
    {
        var store = CreateStore();
        var created = CreateSimpleRoom(store);
        var firstRoundId = created.Snapshot!.PlanningSession!.ActiveRound!.RoundId;
        store.JoinRoom(new JoinRoomRequest(created.Snapshot.RoomCode, "p-2", "Sam"), "c-2");
        var emptyReveal = store.RevealVotes(new RevealVotesRequest(created.Snapshot.RoomCode, "p-1", firstRoundId));
        store.CastVote(new CastVoteRequest(created.Snapshot.RoomCode, "p-1", firstRoundId, "8"));

        var beforeReveal = store.StartSimplePlanningPokerRound(new StartSimplePlanningPokerRoundRequest(created.Snapshot.RoomCode, "p-1"));
        var forbidden = store.StartSimplePlanningPokerRound(new StartSimplePlanningPokerRoundRequest(created.Snapshot.RoomCode, "p-2"));
        var revealed = store.RevealVotes(new RevealVotesRequest(created.Snapshot.RoomCode, "p-1", firstRoundId));
        var lateJoin = store.JoinRoom(new JoinRoomRequest(created.Snapshot.RoomCode, "p-3", "Alex"), "c-3");
        var freshRound = store.StartSimplePlanningPokerRound(new StartSimplePlanningPokerRoundRequest(created.Snapshot.RoomCode, "p-1"));

        Assert.False(beforeReveal.Success);
        Assert.Equal(RoomErrorCodes.RoundNotRevealed, beforeReveal.Error!.Code);
        Assert.False(forbidden.Success);
        Assert.Equal(RoomErrorCodes.Forbidden, forbidden.Error!.Code);
        Assert.False(emptyReveal.Success);
        Assert.Equal(RoomErrorCodes.NoVotesCast, emptyReveal.Error!.Code);
        Assert.True(revealed.Success);
        Assert.Equal(PlanningRoundStatuses.Revealed, lateJoin.Snapshot!.PlanningSession!.ActiveRound!.Status);
        Assert.False(store.CastVote(new CastVoteRequest(created.Snapshot.RoomCode, "p-3", firstRoundId, "3")).Success);
        Assert.True(freshRound.Success);
        Assert.NotEqual(firstRoundId, freshRound.Snapshot!.PlanningSession!.ActiveRound!.RoundId);
        Assert.Equal(PlanningRoundStatuses.Voting, freshRound.Snapshot.PlanningSession.ActiveRound.Status);
        Assert.DoesNotContain(freshRound.Snapshot.PlanningSession.ActiveRound.Votes, vote => vote.HasVoted);
        Assert.Empty(freshRound.Snapshot.PlanningSession.CompletedRounds);
    }

    [Fact]
    public void AddTaskValidatesTitleAndFacilitatorSelectsCurrentTask()
    {
        var store = CreateStore();
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");
        store.JoinRoom(new JoinRoomRequest(created.Snapshot!.RoomCode, "p-2", "Sam"), "c-2");

        var invalid = store.AddTask(new AddTaskRequest(created.Snapshot.RoomCode, "p-2", "  ", null));
        var added = store.AddTask(new AddTaskRequest(created.Snapshot.RoomCode, "p-2", "Reconnect flow", "Keep the room state."));
        var task = Assert.Single(added.Snapshot!.PlanningSession!.Tasks);
        var nonFacilitatorSelection = store.SelectTask(new SelectTaskRequest(created.Snapshot.RoomCode, "p-2", task.TaskId));
        var selected = store.SelectTask(new SelectTaskRequest(created.Snapshot.RoomCode, "p-1", task.TaskId));
        var missing = store.SelectTask(new SelectTaskRequest(created.Snapshot.RoomCode, "p-1", "missing-task"));

        Assert.False(invalid.Success);
        Assert.Equal(RoomErrorCodes.InvalidTaskTitle, invalid.Error!.Code);
        Assert.True(added.Success);
        Assert.False(nonFacilitatorSelection.Success);
        Assert.Equal(RoomErrorCodes.Forbidden, nonFacilitatorSelection.Error!.Code);
        Assert.True(selected.Success);
        Assert.Equal(task.TaskId, selected.Snapshot!.PlanningSession!.CurrentTaskId);
        Assert.Equal(task.TaskId, selected.Snapshot.PlanningSession.ActiveRound!.TaskId);
        Assert.False(missing.Success);
        Assert.Equal(RoomErrorCodes.TaskNotFound, missing.Error!.Code);
    }

    [Fact]
    public void CastVoteReplacesBeforeRevealAndRejectsInvalidVoting()
    {
        var store = CreateStore();
        var (roomCode, taskId, roundId) = CreateSelectedTask(store);

        var firstVote = store.CastVote(new CastVoteRequest(roomCode, "p-2", roundId, "3"));
        var changedVote = store.CastVote(new CastVoteRequest(roomCode, "p-2", roundId, "5"));
        var staleVote = store.CastVote(new CastVoteRequest(roomCode, "p-2", "old-round", "8"));
        var nonMemberVote = store.CastVote(new CastVoteRequest(roomCode, "p-x", roundId, "8"));
        store.RevealVotes(new RevealVotesRequest(roomCode, "p-1", roundId));
        var postRevealVote = store.CastVote(new CastVoteRequest(roomCode, "p-2", roundId, "13"));

        Assert.True(firstVote.Success);
        Assert.True(changedVote.Success);
        var localVote = changedVote.Snapshot!.PlanningSession!.ActiveRound!.Votes.Single(vote => vote.ParticipantId == "p-2");
        Assert.True(localVote.HasVoted);
        Assert.Equal("5", localVote.Estimate);
        Assert.Equal(taskId, changedVote.Snapshot.PlanningSession.CurrentTaskId);
        Assert.False(staleVote.Success);
        Assert.Equal(RoomErrorCodes.StaleRound, staleVote.Error!.Code);
        Assert.False(nonMemberVote.Success);
        Assert.Equal(RoomErrorCodes.RoomUnavailable, nonMemberVote.Error!.Code);
        Assert.False(postRevealVote.Success);
        Assert.Equal(RoomErrorCodes.VoteClosed, postRevealVote.Error!.Code);
    }

    [Fact]
    public void PreRevealSnapshotsHideOtherParticipantsVotes()
    {
        var store = CreateStore();
        var (roomCode, _, roundId) = CreateSelectedTask(store);
        store.CastVote(new CastVoteRequest(roomCode, "p-1", roundId, "3"));
        store.CastVote(new CastVoteRequest(roomCode, "p-2", roundId, "5"));

        var snapshots = store.GetClientSnapshots(roomCode);
        var facilitatorRound = snapshots.Single(snapshot => snapshot.ConnectionId == "c-1").Snapshot.PlanningSession!.ActiveRound!;
        var participantRound = snapshots.Single(snapshot => snapshot.ConnectionId == "c-2").Snapshot.PlanningSession!.ActiveRound!;

        Assert.Equal("3", facilitatorRound.Votes.Single(vote => vote.ParticipantId == "p-1").Estimate);
        Assert.Null(facilitatorRound.Votes.Single(vote => vote.ParticipantId == "p-2").Estimate);
        Assert.Null(participantRound.Votes.Single(vote => vote.ParticipantId == "p-1").Estimate);
        Assert.Equal("5", participantRound.Votes.Single(vote => vote.ParticipantId == "p-2").Estimate);
        Assert.All(facilitatorRound.Votes, vote => Assert.True(vote.HasVoted));
    }

    [Fact]
    public void RevealAndSaveAverageExcludesDiscussionVotesAndAllowsFractionalAverage()
    {
        var store = CreateStore();
        var (roomCode, taskId, roundId) = CreateSelectedTask(store);
        store.CastVote(new CastVoteRequest(roomCode, "p-1", roundId, "1"));
        store.CastVote(new CastVoteRequest(roomCode, "p-2", roundId, "2"));
        store.JoinRoom(new JoinRoomRequest(roomCode, "p-3", "Alex"), "c-3");
        store.CastVote(new CastVoteRequest(roomCode, "p-3", roundId, "?"));

        var revealed = store.RevealVotes(new RevealVotesRequest(roomCode, "p-1", roundId));
        var saved = store.SaveFinalEstimate(new SaveFinalEstimateRequest(roomCode, "p-1", taskId, roundId));
        var task = Assert.Single(saved.Snapshot!.PlanningSession!.Tasks);

        Assert.True(revealed.Success);
        Assert.Equal(1.5m, revealed.Snapshot!.PlanningSession!.ActiveRound!.ComputedAverage);
        Assert.True(saved.Success);
        Assert.Equal(1.5m, task.FinalEstimate!.Value);
        Assert.Equal(roundId, task.FinalEstimate.RoundId);
        Assert.Null(saved.Snapshot.PlanningSession.ActiveRound);
    }

    [Fact]
    public void AllDiscussionVotesCannotBeSaved()
    {
        var store = CreateStore();
        var (roomCode, taskId, roundId) = CreateSelectedTask(store);
        store.CastVote(new CastVoteRequest(roomCode, "p-1", roundId, "?"));
        store.CastVote(new CastVoteRequest(roomCode, "p-2", roundId, "?"));
        store.RevealVotes(new RevealVotesRequest(roomCode, "p-1", roundId));

        var saved = store.SaveFinalEstimate(new SaveFinalEstimateRequest(roomCode, "p-1", taskId, roundId));

        Assert.False(saved.Success);
        Assert.Equal(RoomErrorCodes.NoNumericVotes, saved.Error!.Code);
    }

    [Fact]
    public void ResetRoundClearsVotesAndPreservesSavedEstimateUntilNewSave()
    {
        var store = CreateStore();
        var (roomCode, taskId, roundId) = CreateSelectedTask(store);
        SaveRound(store, roomCode, taskId, roundId, "3", "5");

        var reset = store.ResetRound(new ResetRoundRequest(roomCode, "p-1", taskId));
        var newRound = reset.Snapshot!.PlanningSession!.ActiveRound!;
        store.CastVote(new CastVoteRequest(roomCode, "p-1", newRound.RoundId, "8"));
        store.CastVote(new CastVoteRequest(roomCode, "p-2", newRound.RoundId, "8"));
        store.RevealVotes(new RevealVotesRequest(roomCode, "p-1", newRound.RoundId));
        var savedAgain = store.SaveFinalEstimate(new SaveFinalEstimateRequest(roomCode, "p-1", taskId, newRound.RoundId));
        var task = Assert.Single(savedAgain.Snapshot!.PlanningSession!.Tasks);

        Assert.NotEqual(roundId, newRound.RoundId);
        Assert.All(newRound.Votes, vote => Assert.False(vote.HasVoted));
        Assert.Equal(4m, reset.Snapshot.PlanningSession.Tasks.Single().FinalEstimate!.Value);
        Assert.Equal(8m, task.FinalEstimate!.Value);
        Assert.Equal(newRound.RoundId, task.FinalEstimate.RoundId);
    }

    [Fact]
    public void CompletedRoundRetentionRollsOldEstimatesIntoArchivedTotal()
    {
        var store = CreateStore();
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");
        store.JoinRoom(new JoinRoomRequest(created.Snapshot!.RoomCode, "p-2", "Sam"), "c-2");
        var roomCode = created.Snapshot.RoomCode;

        var estimates = new[] { "1", "2", "3", "5", "8", "13" };
        for (var i = 1; i <= estimates.Length; i++)
        {
            var added = store.AddTask(new AddTaskRequest(roomCode, "p-1", $"Task {i}", null));
            var taskId = added.Snapshot!.PlanningSession!.Tasks.Last().TaskId;
            var selected = store.SelectTask(new SelectTaskRequest(roomCode, "p-1", taskId));
            SaveRound(store, roomCode, taskId, selected.Snapshot!.PlanningSession!.ActiveRound!.RoundId, estimates[i - 1], estimates[i - 1]);
        }

        var completed = store.CompleteEstimation(new CompleteEstimationRequest(roomCode, "p-1"));
        var planning = completed.Snapshot!.PlanningSession!;

        Assert.Equal(5, planning.CompletedRounds.Count);
        Assert.Equal(1m, planning.ArchivedEstimateTotal);
        Assert.True(planning.Tasks.Single(task => task.Title == "Task 1").FinalEstimate!.Archived);
        Assert.Equal(32m, planning.CompletedTotalEstimate);
    }

    [Fact]
    public void CompleteEstimationRequiresSavedFinalEstimate()
    {
        var store = CreateStore();
        var (roomCode, _, _) = CreateSelectedTask(store);

        var completed = store.CompleteEstimation(new CompleteEstimationRequest(roomCode, "p-1"));

        Assert.False(completed.Success);
        Assert.Equal(RoomErrorCodes.NoNumericVotes, completed.Error!.Code);
        Assert.Equal("Save at least one final estimate before completing estimation.", completed.Error.Message);
    }

    [Fact]
    public void CompleteEstimationAllowsSavedZeroFinalEstimate()
    {
        var store = CreateStore();
        var (roomCode, taskId, roundId) = CreateSelectedTask(store);
        SaveRound(store, roomCode, taskId, roundId, "0", "0");

        var completed = store.CompleteEstimation(new CompleteEstimationRequest(roomCode, "p-1"));

        Assert.True(completed.Success);
        Assert.Equal(0m, completed.Snapshot!.PlanningSession!.CompletedTotalEstimate);
    }

    [Fact]
    public void ResumeSnapshotPreservesPlanningState()
    {
        var store = CreateStore();
        var (roomCode, taskId, roundId) = CreateSelectedTask(store);
        store.CastVote(new CastVoteRequest(roomCode, "p-2", roundId, "8"));
        var anchor = store.GetClientSnapshots(roomCode).Single(snapshot => snapshot.ConnectionId == "c-2").Snapshot;
        store.MarkDisconnected("c-2");

        var resumed = store.ResumeRoom(new ResumeRoomRequest(roomCode, "p-2", anchor.ResumeToken), "c-3");

        Assert.True(resumed.Success);
        Assert.Equal(taskId, resumed.Snapshot!.PlanningSession!.CurrentTaskId);
        var localVote = resumed.Snapshot.PlanningSession.ActiveRound!.Votes.Single(vote => vote.ParticipantId == "p-2");
        Assert.Equal("8", localVote.Estimate);
    }

    private static InMemoryRoomStore CreateStore(ManualRoomClock? clock = null) =>
        new(
            new RoomStoreOptions("http://localhost:4200", TimeSpan.FromHours(2)),
            clock ?? new ManualRoomClock());

    private static (string RoomCode, string TaskId, string RoundId) CreateSelectedTask(InMemoryRoomStore store)
    {
        var created = store.CreateRoom(new CreateRoomRequest("Sprint planning", "p-1", "Felipe"), "c-1");
        store.JoinRoom(new JoinRoomRequest(created.Snapshot!.RoomCode, "p-2", "Sam"), "c-2");
        var added = store.AddTask(new AddTaskRequest(created.Snapshot.RoomCode, "p-1", "Reconnect flow", null));
        var taskId = Assert.Single(added.Snapshot!.PlanningSession!.Tasks).TaskId;
        var selected = store.SelectTask(new SelectTaskRequest(created.Snapshot.RoomCode, "p-1", taskId));
        return (created.Snapshot.RoomCode, taskId, selected.Snapshot!.PlanningSession!.ActiveRound!.RoundId);
    }

    private static RoomCommandResult CreateSimpleRoom(InMemoryRoomStore store) =>
        store.CreateRoom(new CreateRoomRequest("Quick estimates", "p-1", "Felipe", RoomModes.SimplePlanningPoker), "c-1");

    private static void SaveRound(
        InMemoryRoomStore store,
        string roomCode,
        string taskId,
        string roundId,
        string facilitatorVote,
        string participantVote)
    {
        store.CastVote(new CastVoteRequest(roomCode, "p-1", roundId, facilitatorVote));
        store.CastVote(new CastVoteRequest(roomCode, "p-2", roundId, participantVote));
        store.RevealVotes(new RevealVotesRequest(roomCode, "p-1", roundId));
        var saved = store.SaveFinalEstimate(new SaveFinalEstimateRequest(roomCode, "p-1", taskId, roundId));
        Assert.True(saved.Success);
    }

    private sealed class ManualRoomClock : IRoomClock
    {
        public DateTimeOffset UtcNow { get; private set; } = new(2026, 6, 11, 12, 0, 0, TimeSpan.Zero);

        public void Advance(TimeSpan duration)
        {
            UtcNow += duration;
        }
    }
}
