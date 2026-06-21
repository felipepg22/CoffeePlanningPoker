using System.Security.Cryptography;

namespace CoffeePlanningPoker.Api.Rooms;

public sealed class InMemoryRoomStore(RoomStoreOptions options, IRoomClock clock)
{
    private const int CompletedRoundRetentionLimit = 5;

    private readonly Dictionary<string, RoomState> rooms = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, ConnectionAnchor> connections = new(StringComparer.Ordinal);
    private readonly object gate = new();

    public RoomCommandResult CreateRoom(CreateRoomRequest request, string connectionId)
    {
        var roomName = request.RoomName.Trim();
        var displayName = request.DisplayName.Trim();

        if (!RoomValidation.IsValidRoomName(roomName))
        {
            return Failure(RoomErrorCodes.InvalidRoomName, "Enter a room name with at least 3 characters.");
        }

        if (!RoomValidation.IsValidDisplayName(displayName))
        {
            return Failure(RoomErrorCodes.InvalidDisplayName, "Enter a display name with at least 2 characters.");
        }

        lock (gate)
        {
            CleanupExpiredRoomsCore();

            var now = clock.UtcNow;
            var roomCode = CreateUniqueRoomCode();
            var participant = new ParticipantState(
                ParticipantId: request.ParticipantId,
                DisplayName: displayName,
                Role: ParticipantRoles.Facilitator,
                Presence: ParticipantPresence.Connected,
                ResumeToken: CreateResumeToken(),
                LastSeenAt: now);
            participant.ConnectionIds.Add(connectionId);

            var room = new RoomState(
                RoomCode: roomCode,
                RoomName: roomName,
                CreatedAt: now,
                LastActivityAt: now,
                UpdatedAt: now,
                SnapshotVersion: 1);
            room.Participants[participant.ParticipantId] = participant;
            rooms[roomCode] = room;
            connections[connectionId] = new ConnectionAnchor(roomCode, participant.ParticipantId);

            return Success(room, participant);
        }
    }

    public RoomCommandResult JoinRoom(JoinRoomRequest request, string connectionId)
    {
        var roomCode = RoomValidation.NormalizeRoomCode(request.RoomCode);
        var displayName = request.DisplayName.Trim();

        if (!RoomValidation.IsValidRoomCode(roomCode))
        {
            return Failure(RoomErrorCodes.InvalidRoomCode, "Check the room code and try again.", roomCode);
        }

        if (!RoomValidation.IsValidDisplayName(displayName))
        {
            return Failure(RoomErrorCodes.InvalidDisplayName, "Enter a display name with at least 2 characters.", roomCode);
        }

        lock (gate)
        {
            CleanupExpiredRoomsCore();

            if (!rooms.TryGetValue(roomCode, out var room))
            {
                return Failure(RoomErrorCodes.RoomUnavailable, "That room is unavailable.", roomCode);
            }

            var now = clock.UtcNow;
            var isNewParticipant = !room.Participants.TryGetValue(request.ParticipantId, out var participant);
            if (participant is null)
            {
                participant = new ParticipantState(
                    ParticipantId: request.ParticipantId,
                    DisplayName: displayName,
                    Role: ParticipantRoles.Participant,
                    Presence: ParticipantPresence.Connected,
                    ResumeToken: CreateResumeToken(),
                    LastSeenAt: now);
                room.Participants[participant.ParticipantId] = participant;
            }
            else
            {
                participant.DisplayName = displayName;
                participant.Presence = ParticipantPresence.Connected;
                participant.LastSeenAt = now;
            }

            participant.ConnectionIds.Add(connectionId);
            connections[connectionId] = new ConnectionAnchor(roomCode, participant.ParticipantId);
            Touch(room, now);

            return Success(room, participant, isNewParticipant ? RoomEvents.ParticipantJoined : RoomEvents.PresenceChanged);
        }
    }

    public RoomCommandResult ResumeRoom(ResumeRoomRequest request, string connectionId)
    {
        var roomCode = RoomValidation.NormalizeRoomCode(request.RoomCode);

        if (!RoomValidation.IsValidRoomCode(roomCode))
        {
            return Failure(RoomErrorCodes.InvalidRoomCode, "Check the room code and try again.", roomCode);
        }

        lock (gate)
        {
            CleanupExpiredRoomsCore();

            if (!rooms.TryGetValue(roomCode, out var room) ||
                !room.Participants.TryGetValue(request.ParticipantId, out var participant) ||
                !StringComparer.Ordinal.Equals(participant.ResumeToken, request.ResumeToken))
            {
                return Failure(RoomErrorCodes.ResumeRejected, "This room session could not be resumed.", roomCode);
            }

            var now = clock.UtcNow;
            participant.Presence = ParticipantPresence.Connected;
            participant.LastSeenAt = now;
            participant.ConnectionIds.Add(connectionId);
            connections[connectionId] = new ConnectionAnchor(roomCode, participant.ParticipantId);
            Touch(room, now);

            return Success(room, participant, RoomEvents.PresenceChanged);
        }
    }

    public RoomCommandResult LeaveRoom(LeaveRoomRequest request, string connectionId)
    {
        var roomCode = RoomValidation.NormalizeRoomCode(request.RoomCode);

        lock (gate)
        {
            if (!rooms.TryGetValue(roomCode, out var room) ||
                !room.Participants.TryGetValue(request.ParticipantId, out var participant))
            {
                return Failure(RoomErrorCodes.RoomUnavailable, "That room is unavailable.", roomCode);
            }

            participant.ConnectionIds.Remove(connectionId);
            participant.ConnectionIds.Clear();
            participant.Presence = ParticipantPresence.Left;
            participant.LastSeenAt = clock.UtcNow;
            connections.Remove(connectionId);
            Touch(room, participant.LastSeenAt);

            return Success(room, participant, RoomEvents.ParticipantLeft);
        }
    }

    public RoomCommandResult Heartbeat(HeartbeatRequest request, string connectionId)
    {
        var roomCode = RoomValidation.NormalizeRoomCode(request.RoomCode);

        lock (gate)
        {
            if (!rooms.TryGetValue(roomCode, out var room) ||
                !room.Participants.TryGetValue(request.ParticipantId, out var participant))
            {
                return Failure(RoomErrorCodes.RoomUnavailable, "That room is unavailable.", roomCode);
            }

            participant.ConnectionIds.Add(connectionId);
            participant.Presence = ParticipantPresence.Connected;
            participant.LastSeenAt = clock.UtcNow;
            connections[connectionId] = new ConnectionAnchor(roomCode, participant.ParticipantId);
            Touch(room, participant.LastSeenAt);

            return Success(room, participant);
        }
    }

    public RoomCommandResult AddTask(AddTaskRequest request)
    {
        var title = request.Title.Trim();
        var details = request.Details?.Trim() ?? string.Empty;

        if (!RoomValidation.IsValidTaskTitle(title))
        {
            return Failure(RoomErrorCodes.InvalidTaskTitle, "Add a task title with at least 3 characters.", request.RoomCode);
        }

        return MutateAsMember(request.RoomCode, request.ParticipantId, (room, participant, now) =>
        {
            if (room.EstimationStatus == RoomEstimationStatuses.Completed)
            {
                return Failure(RoomErrorCodes.RoomCompleted, "This room estimation is already complete.", room.RoomCode);
            }

            var task = new PlanningTaskState(
                TaskId: CreateTaskId(room),
                Title: title,
                Details: details,
                CreatedAt: now);
            room.Tasks.Add(task);
            Touch(room, now);
            return Success(room, participant);
        });
    }

    public RoomCommandResult SelectTask(SelectTaskRequest request)
    {
        return MutateAsFacilitator(request.RoomCode, request.ParticipantId, (room, participant, now) =>
        {
            if (room.EstimationStatus == RoomEstimationStatuses.Completed)
            {
                return Failure(RoomErrorCodes.RoomCompleted, "This room estimation is already complete.", room.RoomCode);
            }

            var task = FindTask(room, request.TaskId);
            if (task is null)
            {
                return Failure(RoomErrorCodes.TaskNotFound, "That task is no longer available.", room.RoomCode);
            }

            CloseActiveRound(room, now);
            room.CurrentTaskId = task.TaskId;
            if (task.FinalEstimate is null)
            {
                room.ActiveRound = CreateRound(task.TaskId, now);
            }

            Touch(room, now);
            return Success(room, participant);
        });
    }

    public RoomCommandResult CastVote(CastVoteRequest request)
    {
        var estimate = request.Estimate.Trim();
        if (!EstimateCards.IsValid(estimate))
        {
            return Failure(RoomErrorCodes.InvalidEstimate, "Choose a valid estimate card.", request.RoomCode);
        }

        return MutateAsMember(request.RoomCode, request.ParticipantId, (room, participant, now) =>
        {
            if (room.EstimationStatus == RoomEstimationStatuses.Completed)
            {
                return Failure(RoomErrorCodes.RoomCompleted, "This room estimation is already complete.", room.RoomCode);
            }

            var staleResult = ValidateActiveRound(room, request.RoundId);
            if (staleResult is not null)
            {
                return staleResult;
            }

            if (room.ActiveRound!.Status != PlanningRoundStatuses.Voting)
            {
                return Failure(RoomErrorCodes.VoteClosed, "Votes are closed for this round.", room.RoomCode);
            }

            room.ActiveRound.Votes[participant.ParticipantId] = new ParticipantVoteState(
                ParticipantId: participant.ParticipantId,
                Estimate: estimate,
                VotedAt: now);
            Touch(room, now);
            return Success(room, participant);
        });
    }

    public RoomCommandResult RevealVotes(RevealVotesRequest request)
    {
        return MutateAsFacilitator(request.RoomCode, request.ParticipantId, (room, participant, now) =>
        {
            var staleResult = ValidateActiveRound(room, request.RoundId);
            if (staleResult is not null)
            {
                return staleResult;
            }

            if (room.ActiveRound!.Status != PlanningRoundStatuses.Voting)
            {
                return Success(room, participant);
            }

            room.ActiveRound.Status = PlanningRoundStatuses.Revealed;
            room.ActiveRound.RevealedAt = now;
            Touch(room, now);
            return Success(room, participant);
        });
    }

    public RoomCommandResult ResetRound(ResetRoundRequest request)
    {
        return MutateAsFacilitator(request.RoomCode, request.ParticipantId, (room, participant, now) =>
        {
            if (room.EstimationStatus == RoomEstimationStatuses.Completed)
            {
                return Failure(RoomErrorCodes.RoomCompleted, "This room estimation is already complete.", room.RoomCode);
            }

            var task = FindTask(room, request.TaskId);
            if (task is null)
            {
                return Failure(RoomErrorCodes.TaskNotFound, "That task is no longer available.", room.RoomCode);
            }

            CloseActiveRound(room, now);
            room.CurrentTaskId = task.TaskId;
            room.ActiveRound = CreateRound(task.TaskId, now);
            Touch(room, now);
            return Success(room, participant);
        });
    }

    public RoomCommandResult StartNextRound(StartNextRoundRequest request)
    {
        return MutateAsFacilitator(request.RoomCode, request.ParticipantId, (room, participant, now) =>
        {
            if (room.EstimationStatus == RoomEstimationStatuses.Completed)
            {
                return Failure(RoomErrorCodes.RoomCompleted, "This room estimation is already complete.", room.RoomCode);
            }

            var task = request.TaskId is { Length: > 0 }
                ? FindTask(room, request.TaskId)
                : FindNextTask(room);
            if (task is null)
            {
                return Failure(RoomErrorCodes.TaskNotFound, "Add or choose a task before starting a round.", room.RoomCode);
            }

            CloseActiveRound(room, now);
            room.CurrentTaskId = task.TaskId;
            room.ActiveRound = CreateRound(task.TaskId, now);
            Touch(room, now);
            return Success(room, participant);
        });
    }

    public RoomCommandResult SaveFinalEstimate(SaveFinalEstimateRequest request)
    {
        return MutateAsFacilitator(request.RoomCode, request.ParticipantId, (room, participant, now) =>
        {
            if (room.EstimationStatus == RoomEstimationStatuses.Completed)
            {
                return Failure(RoomErrorCodes.RoomCompleted, "This room estimation is already complete.", room.RoomCode);
            }

            var task = FindTask(room, request.TaskId);
            if (task is null)
            {
                return Failure(RoomErrorCodes.TaskNotFound, "That task is no longer available.", room.RoomCode);
            }

            var staleResult = ValidateActiveRound(room, request.RoundId, request.TaskId);
            if (staleResult is not null)
            {
                return staleResult;
            }

            if (room.ActiveRound!.Status != PlanningRoundStatuses.Revealed)
            {
                return Failure(RoomErrorCodes.RoundNotRevealed, "Reveal votes before saving an estimate.", room.RoomCode);
            }

            var average = ComputeAverage(room.ActiveRound);
            if (average is null)
            {
                return Failure(RoomErrorCodes.NoNumericVotes, "A numeric vote is required before saving an estimate.", room.RoomCode);
            }

            task.FinalEstimate = new FinalEstimateState(
                Value: average.Value,
                RoundId: room.ActiveRound.RoundId,
                SavedAt: now,
                Archived: false);
            room.ActiveRound.Status = PlanningRoundStatuses.Closed;
            room.ActiveRound.ClosedAt = now;
            room.CompletedRounds.Add(room.ActiveRound);
            room.ActiveRound = null;
            PruneCompletedRounds(room);
            Touch(room, now);
            return Success(room, participant);
        });
    }

    public RoomCommandResult CompleteEstimation(CompleteEstimationRequest request)
    {
        return MutateAsFacilitator(request.RoomCode, request.ParticipantId, (room, participant, now) =>
        {
            if (!HasSavedFinalEstimate(room))
            {
                return Failure(RoomErrorCodes.NoNumericVotes, "Save at least one final estimate before completing estimation.", room.RoomCode);
            }

            room.EstimationStatus = RoomEstimationStatuses.Completed;
            room.CompletedTotalEstimate = CalculateTotal(room);
            Touch(room, now);
            return Success(room, participant);
        });
    }

    public IReadOnlyList<RoomClientSnapshot> GetClientSnapshots(string roomCode)
    {
        var normalized = RoomValidation.NormalizeRoomCode(roomCode);

        lock (gate)
        {
            if (!rooms.TryGetValue(normalized, out var room))
            {
                return [];
            }

            return room.Participants.Values
                .SelectMany(participant => participant.ConnectionIds.Select(connectionId => new RoomClientSnapshot(connectionId, ToSnapshot(room, participant))))
                .ToArray();
        }
    }

    public RoomParticipantEvent? MarkDisconnected(string connectionId)
    {
        lock (gate)
        {
            if (!connections.Remove(connectionId, out var anchor) ||
                !rooms.TryGetValue(anchor.RoomCode, out var room) ||
                !room.Participants.TryGetValue(anchor.ParticipantId, out var participant))
            {
                return null;
            }

            participant.ConnectionIds.Remove(connectionId);
            if (participant.ConnectionIds.Count == 0 && participant.Presence != ParticipantPresence.Left)
            {
                participant.Presence = ParticipantPresence.Reconnecting;
                participant.LastSeenAt = clock.UtcNow;
                Touch(room, participant.LastSeenAt);
            }

            return new RoomParticipantEvent(room.RoomCode, ToDto(participant));
        }
    }

    public int CleanupExpiredRooms()
    {
        lock (gate)
        {
            return CleanupExpiredRoomsCore();
        }
    }

    private RoomCommandResult MutateAsMember(
        string roomCode,
        string participantId,
        Func<RoomState, ParticipantState, DateTimeOffset, RoomCommandResult> mutation)
    {
        var normalized = RoomValidation.NormalizeRoomCode(roomCode);

        if (!RoomValidation.IsValidRoomCode(normalized))
        {
            return Failure(RoomErrorCodes.InvalidRoomCode, "Check the room code and try again.", normalized);
        }

        lock (gate)
        {
            CleanupExpiredRoomsCore();

            if (!rooms.TryGetValue(normalized, out var room) ||
                !room.Participants.TryGetValue(participantId, out var participant) ||
                participant.Presence == ParticipantPresence.Left)
            {
                return Failure(RoomErrorCodes.RoomUnavailable, "That room is unavailable.", normalized);
            }

            return mutation(room, participant, clock.UtcNow);
        }
    }

    private RoomCommandResult MutateAsFacilitator(
        string roomCode,
        string participantId,
        Func<RoomState, ParticipantState, DateTimeOffset, RoomCommandResult> mutation)
    {
        return MutateAsMember(roomCode, participantId, (room, participant, now) =>
        {
            if (participant.Role != ParticipantRoles.Facilitator)
            {
                return Failure(RoomErrorCodes.Forbidden, "Only the facilitator can do that.", room.RoomCode);
            }

            return mutation(room, participant, now);
        });
    }

    private int CleanupExpiredRoomsCore()
    {
        var expiresBefore = clock.UtcNow - options.RoomTtl;
        var expiredCodes = rooms
            .Where(room => room.Value.LastActivityAt < expiresBefore)
            .Select(room => room.Key)
            .ToArray();

        foreach (var roomCode in expiredCodes)
        {
            rooms.Remove(roomCode);
        }

        if (expiredCodes.Length == 0)
        {
            return 0;
        }

        var expiredSet = expiredCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var connection in connections.Where(connection => expiredSet.Contains(connection.Value.RoomCode)).ToArray())
        {
            connections.Remove(connection.Key);
        }

        return expiredCodes.Length;
    }

    private static void Touch(RoomState room, DateTimeOffset now)
    {
        room.LastActivityAt = now;
        room.UpdatedAt = now;
        room.SnapshotVersion++;
    }

    private string CreateUniqueRoomCode()
    {
        for (var attempt = 0; attempt < 100; attempt++)
        {
            var code = $"BREW-{RandomNumberGenerator.GetInt32(100, 1000)}";
            if (!rooms.ContainsKey(code))
            {
                return code;
            }
        }

        return $"ROOM-{RandomNumberGenerator.GetInt32(10000, 99999)}";
    }

    private static string CreateResumeToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static string CreateTaskId(RoomState room)
    {
        room.NextTaskNumber++;
        return $"task-{room.NextTaskNumber}";
    }

    private static PlanningRoundState CreateRound(string taskId, DateTimeOffset now) =>
        new(
            RoundId: $"round-{Guid.NewGuid():N}",
            TaskId: taskId,
            Status: PlanningRoundStatuses.Voting,
            CreatedAt: now);

    private static PlanningTaskState? FindTask(RoomState room, string taskId) =>
        room.Tasks.FirstOrDefault(task => StringComparer.Ordinal.Equals(task.TaskId, taskId));

    private static PlanningTaskState? FindNextTask(RoomState room)
    {
        if (room.Tasks.Count == 0)
        {
            return null;
        }

        var currentIndex = room.CurrentTaskId is null
            ? -1
            : room.Tasks.FindIndex(task => StringComparer.Ordinal.Equals(task.TaskId, room.CurrentTaskId));
        var afterCurrent = room.Tasks
            .Skip(Math.Max(currentIndex + 1, 0))
            .FirstOrDefault(task => task.FinalEstimate is null);
        return afterCurrent ?? room.Tasks.FirstOrDefault(task => task.FinalEstimate is null) ?? room.Tasks[0];
    }

    private static RoomCommandResult? ValidateActiveRound(RoomState room, string roundId, string? taskId = null)
    {
        if (room.ActiveRound is null)
        {
            return Failure(RoomErrorCodes.NoActiveTask, "Select a task before working with votes.", room.RoomCode);
        }

        if (!StringComparer.Ordinal.Equals(room.ActiveRound.RoundId, roundId) ||
            (taskId is not null && !StringComparer.Ordinal.Equals(room.ActiveRound.TaskId, taskId)))
        {
            return Failure(RoomErrorCodes.StaleRound, "This round changed. Use the latest room state.", room.RoomCode);
        }

        return null;
    }

    private static void CloseActiveRound(RoomState room, DateTimeOffset now)
    {
        if (room.ActiveRound is null)
        {
            return;
        }

        room.ActiveRound.Status = PlanningRoundStatuses.Closed;
        room.ActiveRound.ClosedAt = now;
        if (room.ActiveRound.RevealedAt is not null)
        {
            room.CompletedRounds.Add(room.ActiveRound);
            PruneCompletedRounds(room);
        }

        room.ActiveRound = null;
    }

    private static decimal? ComputeAverage(PlanningRoundState round)
    {
        var numericVotes = round.Votes.Values
            .Select(vote => EstimateCards.TryGetNumericValue(vote.Estimate, out var numericValue) ? numericValue : (decimal?)null)
            .Where(value => value is not null)
            .Select(value => value!.Value)
            .ToArray();

        return numericVotes.Length == 0 ? null : numericVotes.Average();
    }

    private static void PruneCompletedRounds(RoomState room)
    {
        while (room.CompletedRounds.Count > CompletedRoundRetentionLimit)
        {
            var pruned = room.CompletedRounds[0];
            room.CompletedRounds.RemoveAt(0);

            var task = FindTask(room, pruned.TaskId);
            if (task?.FinalEstimate is { Archived: false } estimate &&
                StringComparer.Ordinal.Equals(estimate.RoundId, pruned.RoundId))
            {
                room.ArchivedEstimateTotal += estimate.Value;
                task.FinalEstimate = estimate with { Archived = true };
            }
        }
    }

    private static decimal CalculateTotal(RoomState room) =>
        room.ArchivedEstimateTotal + room.Tasks
            .Select(task => task.FinalEstimate)
            .Where(estimate => estimate is { Archived: false })
            .Select(estimate => estimate!.Value)
            .Sum();

    private static bool HasSavedFinalEstimate(RoomState room) =>
        room.Tasks.Any(task => task.FinalEstimate is not null);

    private static RoomCommandResult Failure(string code, string message, string? roomCode = null) =>
        new(false, null, new RoomErrorDto(code, message, roomCode));

    private RoomCommandResult Success(RoomState room, ParticipantState participant, string? roomEvent = null) =>
        new(true, ToSnapshot(room, participant), null, ToDto(participant), roomEvent);

    private RoomSnapshotDto ToSnapshot(RoomState room, ParticipantState localParticipant) =>
        new(
            room.RoomCode,
            room.RoomName,
            $"{options.ClientOrigin.TrimEnd('/')}/rooms/{room.RoomCode.ToLowerInvariant()}",
            localParticipant.ParticipantId,
            localParticipant.ResumeToken,
            room.CreatedAt,
            room.UpdatedAt,
            room.SnapshotVersion,
            room.Participants.Values
                .OrderBy(participant => participant.Role == ParticipantRoles.Facilitator ? 0 : 1)
                .ThenBy(participant => participant.DisplayName, StringComparer.OrdinalIgnoreCase)
                .Select(ToDto)
                .ToArray(),
            ToPlanningSessionDto(room, localParticipant));

    private static RoomPlanningSessionDto ToPlanningSessionDto(RoomState room, ParticipantState localParticipant) =>
        new(
            EstimateCards.Values,
            room.Tasks.Select(task => ToTaskDto(room, task)).ToArray(),
            room.CurrentTaskId,
            room.ActiveRound is null ? null : ToRoundDto(room, room.ActiveRound, localParticipant, includeHiddenValues: false, includeAllParticipants: true),
            room.CompletedRounds.Select(round => ToRoundDto(room, round, localParticipant, includeHiddenValues: true, includeAllParticipants: false)).ToArray(),
            room.ArchivedEstimateTotal,
            room.EstimationStatus,
            room.CompletedTotalEstimate);

    private static PlanningTaskDto ToTaskDto(RoomState room, PlanningTaskState task) =>
        new(
            task.TaskId,
            task.Title,
            task.Details,
            room.ActiveRound?.TaskId == task.TaskId ? PlanningTaskStatuses.Estimating :
                task.FinalEstimate is null ? PlanningTaskStatuses.Unestimated : PlanningTaskStatuses.Estimated,
            task.FinalEstimate is null ? null : new FinalEstimateDto(
                task.FinalEstimate.Value,
                task.FinalEstimate.RoundId,
                task.FinalEstimate.SavedAt,
                task.FinalEstimate.Archived));

    private static PlanningRoundDto ToRoundDto(
        RoomState room,
        PlanningRoundState round,
        ParticipantState localParticipant,
        bool includeHiddenValues,
        bool includeAllParticipants)
    {
        var participants = includeAllParticipants
            ? room.Participants.Values
            : room.Participants.Values.Where(participant => round.Votes.ContainsKey(participant.ParticipantId));
        var revealValues = includeHiddenValues || round.Status != PlanningRoundStatuses.Voting;

        return new PlanningRoundDto(
            round.RoundId,
            round.TaskId,
            round.Status,
            round.CreatedAt,
            round.RevealedAt,
            round.ClosedAt,
            participants
                .OrderBy(participant => participant.Role == ParticipantRoles.Facilitator ? 0 : 1)
                .ThenBy(participant => participant.DisplayName, StringComparer.OrdinalIgnoreCase)
                .Select(participant => ToVoteDto(round, participant, localParticipant, revealValues))
                .ToArray(),
            revealValues ? ComputeAverage(round) : null);
    }

    private static ParticipantVoteDto ToVoteDto(
        PlanningRoundState round,
        ParticipantState participant,
        ParticipantState localParticipant,
        bool revealValues)
    {
        var hasVote = round.Votes.TryGetValue(participant.ParticipantId, out var vote);
        var canSeeValue = hasVote && (revealValues || StringComparer.Ordinal.Equals(participant.ParticipantId, localParticipant.ParticipantId));

        return new ParticipantVoteDto(
            participant.ParticipantId,
            hasVote,
            canSeeValue ? vote!.Estimate : null,
            canSeeValue ? vote!.VotedAt : null);
    }

    private static RoomParticipantDto ToDto(ParticipantState participant) =>
        new(
            participant.ParticipantId,
            participant.DisplayName,
            participant.Role,
            participant.Presence,
            participant.LastSeenAt);

    private sealed record ConnectionAnchor(string RoomCode, string ParticipantId);

    private sealed class RoomState(
        string RoomCode,
        string RoomName,
        DateTimeOffset CreatedAt,
        DateTimeOffset LastActivityAt,
        DateTimeOffset UpdatedAt,
        long SnapshotVersion)
    {
        public string RoomCode { get; } = RoomCode;
        public string RoomName { get; } = RoomName;
        public DateTimeOffset CreatedAt { get; } = CreatedAt;
        public DateTimeOffset LastActivityAt { get; set; } = LastActivityAt;
        public DateTimeOffset UpdatedAt { get; set; } = UpdatedAt;
        public long SnapshotVersion { get; set; } = SnapshotVersion;
        public Dictionary<string, ParticipantState> Participants { get; } = new(StringComparer.Ordinal);
        public List<PlanningTaskState> Tasks { get; } = [];
        public string? CurrentTaskId { get; set; }
        public PlanningRoundState? ActiveRound { get; set; }
        public List<PlanningRoundState> CompletedRounds { get; } = [];
        public decimal ArchivedEstimateTotal { get; set; }
        public string EstimationStatus { get; set; } = RoomEstimationStatuses.Active;
        public decimal? CompletedTotalEstimate { get; set; }
        public int NextTaskNumber { get; set; }
    }

    private sealed class ParticipantState(
        string ParticipantId,
        string DisplayName,
        string Role,
        string Presence,
        string ResumeToken,
        DateTimeOffset LastSeenAt)
    {
        public string ParticipantId { get; } = ParticipantId;
        public string DisplayName { get; set; } = DisplayName;
        public string Role { get; } = Role;
        public string Presence { get; set; } = Presence;
        public string ResumeToken { get; } = ResumeToken;
        public DateTimeOffset LastSeenAt { get; set; } = LastSeenAt;
        public HashSet<string> ConnectionIds { get; } = new(StringComparer.Ordinal);
    }

    private sealed class PlanningTaskState(
        string TaskId,
        string Title,
        string Details,
        DateTimeOffset CreatedAt)
    {
        public string TaskId { get; } = TaskId;
        public string Title { get; } = Title;
        public string Details { get; } = Details;
        public DateTimeOffset CreatedAt { get; } = CreatedAt;
        public FinalEstimateState? FinalEstimate { get; set; }
    }

    private sealed class PlanningRoundState(
        string RoundId,
        string TaskId,
        string Status,
        DateTimeOffset CreatedAt)
    {
        public string RoundId { get; } = RoundId;
        public string TaskId { get; } = TaskId;
        public string Status { get; set; } = Status;
        public DateTimeOffset CreatedAt { get; } = CreatedAt;
        public DateTimeOffset? RevealedAt { get; set; }
        public DateTimeOffset? ClosedAt { get; set; }
        public Dictionary<string, ParticipantVoteState> Votes { get; } = new(StringComparer.Ordinal);
    }

    private sealed record ParticipantVoteState(
        string ParticipantId,
        string Estimate,
        DateTimeOffset VotedAt);

    private sealed record FinalEstimateState(
        decimal Value,
        string RoundId,
        DateTimeOffset SavedAt,
        bool Archived);
}
