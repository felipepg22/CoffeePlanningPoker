using Microsoft.AspNetCore.SignalR;

namespace CoffeePlanningPoker.Api.Rooms;

public sealed class RoomHub(InMemoryRoomStore store) : Hub
{
    public async Task<RoomCommandResult> CreateRoom(CreateRoomRequest request)
    {
        var result = store.CreateRoom(request, Context.ConnectionId);
        if (result.Success && result.Snapshot is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, result.Snapshot.RoomCode);
            return result;
        }

        await SendError(result);
        return result;
    }

    public async Task<RoomCommandResult> JoinRoom(JoinRoomRequest request)
    {
        var result = store.JoinRoom(request, Context.ConnectionId);
        if (result.Success && result.Snapshot is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, result.Snapshot.RoomCode);
            await BroadcastEvent(result);
            return result;
        }

        await SendError(result);
        return result;
    }

    public async Task<RoomCommandResult> ResumeRoom(ResumeRoomRequest request)
    {
        var result = store.ResumeRoom(request, Context.ConnectionId);
        if (result.Success && result.Snapshot is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, result.Snapshot.RoomCode);
            await BroadcastEvent(result);
            return result;
        }

        await SendError(result);
        return result;
    }

    public async Task<RoomCommandResult> LeaveRoom(LeaveRoomRequest request)
    {
        var result = store.LeaveRoom(request, Context.ConnectionId);
        if (result.Success && result.Snapshot is not null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, result.Snapshot.RoomCode);
            await BroadcastEvent(result);
            return result;
        }

        await SendError(result);
        return result;
    }

    public async Task<RoomCommandResult> Heartbeat(HeartbeatRequest request)
    {
        var result = store.Heartbeat(request, Context.ConnectionId);
        if (!result.Success)
        {
            await SendError(result);
        }

        return result;
    }

    public Task<RoomCommandResult> AddTask(AddTaskRequest request) =>
        MutatePlanningSession(store.AddTask(request));

    public Task<RoomCommandResult> SelectTask(SelectTaskRequest request) =>
        MutatePlanningSession(store.SelectTask(request));

    public Task<RoomCommandResult> CastVote(CastVoteRequest request) =>
        MutatePlanningSession(store.CastVote(request));

    public Task<RoomCommandResult> RevealVotes(RevealVotesRequest request) =>
        MutatePlanningSession(store.RevealVotes(request));

    public Task<RoomCommandResult> ResetRound(ResetRoundRequest request) =>
        MutatePlanningSession(store.ResetRound(request));

    public Task<RoomCommandResult> StartNextRound(StartNextRoundRequest request) =>
        MutatePlanningSession(store.StartNextRound(request));

    public Task<RoomCommandResult> StartSimplePlanningPokerRound(StartSimplePlanningPokerRoundRequest request) =>
        MutatePlanningSession(store.StartSimplePlanningPokerRound(request));

    public Task<RoomCommandResult> SaveFinalEstimate(SaveFinalEstimateRequest request) =>
        MutatePlanningSession(store.SaveFinalEstimate(request));

    public Task<RoomCommandResult> CompleteEstimation(CompleteEstimationRequest request) =>
        MutatePlanningSession(store.CompleteEstimation(request));

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var participantEvent = store.MarkDisconnected(Context.ConnectionId);
        if (participantEvent is not null)
        {
            await Clients.Group(participantEvent.RoomCode).SendAsync("PresenceChanged", participantEvent);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task<RoomCommandResult> MutatePlanningSession(RoomCommandResult result)
    {
        if (!result.Success || result.Snapshot is null)
        {
            await SendError(result);
            return result;
        }

        await BroadcastSnapshots(result.Snapshot.RoomCode);
        return result;
    }

    private async Task BroadcastEvent(RoomCommandResult result)
    {
        if (result.Snapshot is null || result.Participant is null || result.Event is null)
        {
            return;
        }

        var payload = new RoomParticipantEvent(result.Snapshot.RoomCode, result.Participant);
        var clients = Clients.OthersInGroup(result.Snapshot.RoomCode);

        if (result.Event == RoomEvents.ParticipantJoined)
        {
            await clients.SendAsync("ParticipantJoined", payload);
            return;
        }

        if (result.Event == RoomEvents.ParticipantLeft)
        {
            await clients.SendAsync("ParticipantLeft", payload);
            return;
        }

        await clients.SendAsync("PresenceChanged", payload);
    }

    private async Task BroadcastSnapshots(string roomCode)
    {
        foreach (var clientSnapshot in store.GetClientSnapshots(roomCode))
        {
            await Clients.Client(clientSnapshot.ConnectionId).SendAsync("RoomSnapshot", clientSnapshot.Snapshot);
        }
    }

    private async Task SendError(RoomCommandResult result)
    {
        if (result.Error is not null)
        {
            await Clients.Caller.SendAsync("RoomError", result.Error);
        }
    }
}
