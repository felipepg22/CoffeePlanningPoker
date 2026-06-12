using CoffePlanningPoker.Api.Rooms;

namespace CoffePlanningPoker.Api.Tests;

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

        clock.Advance(TimeSpan.FromHours(25));
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

    private static InMemoryRoomStore CreateStore(ManualRoomClock? clock = null) =>
        new(
            new RoomStoreOptions("http://localhost:4200", TimeSpan.FromHours(24)),
            clock ?? new ManualRoomClock());

    private sealed class ManualRoomClock : IRoomClock
    {
        public DateTimeOffset UtcNow { get; private set; } = new(2026, 6, 11, 12, 0, 0, TimeSpan.Zero);

        public void Advance(TimeSpan duration)
        {
            UtcNow += duration;
        }
    }
}
