namespace CoffeePlanningPoker.Api.Rooms;

public static class RoomErrorCodes
{
    public const string InvalidRoomName = "invalid_room_name";
    public const string InvalidDisplayName = "invalid_display_name";
    public const string InvalidRoomCode = "invalid_room_code";
    public const string RoomUnavailable = "room_unavailable";
    public const string ResumeRejected = "resume_rejected";
    public const string DuplicateJoinRejected = "duplicate_join_rejected";
    public const string InvalidTaskTitle = "invalid_task_title";
    public const string Forbidden = "forbidden";
    public const string TaskNotFound = "task_not_found";
    public const string NoActiveTask = "no_active_task";
    public const string StaleRound = "stale_round";
    public const string InvalidEstimate = "invalid_estimate";
    public const string VoteClosed = "vote_closed";
    public const string RoundNotRevealed = "round_not_revealed";
    public const string NoNumericVotes = "no_numeric_votes";
    public const string RoomCompleted = "room_completed";
}

public static class ParticipantRoles
{
    public const string Facilitator = "facilitator";
    public const string Participant = "participant";
}

public static class ParticipantPresence
{
    public const string Connected = "connected";
    public const string Reconnecting = "reconnecting";
    public const string Disconnected = "disconnected";
    public const string Left = "left";
}

public static class RoomEvents
{
    public const string ParticipantJoined = "participant_joined";
    public const string ParticipantLeft = "participant_left";
    public const string PresenceChanged = "presence_changed";
}

public static class EstimateCards
{
    public static readonly IReadOnlyList<string> Values = ["0", "1", "2", "3", "5", "8", "13", "21", "?"];

    public static bool IsValid(string value) =>
        Values.Contains(value, StringComparer.Ordinal);

    public static bool TryGetNumericValue(string value, out decimal numericValue) =>
        decimal.TryParse(value, out numericValue);
}

public static class PlanningRoundStatuses
{
    public const string Voting = "voting";
    public const string Revealed = "revealed";
    public const string Closed = "closed";
}

public static class PlanningTaskStatuses
{
    public const string Unestimated = "unestimated";
    public const string Estimating = "estimating";
    public const string Estimated = "estimated";
}

public static class RoomEstimationStatuses
{
    public const string Active = "active";
    public const string Completed = "completed";
}

public sealed record CreateRoomRequest(string RoomName, string ParticipantId, string DisplayName);

public sealed record JoinRoomRequest(string RoomCode, string ParticipantId, string DisplayName);

public sealed record ResumeRoomRequest(string RoomCode, string ParticipantId, string ResumeToken);

public sealed record LeaveRoomRequest(string RoomCode, string ParticipantId);

public sealed record HeartbeatRequest(string RoomCode, string ParticipantId);

public sealed record AddTaskRequest(string RoomCode, string ParticipantId, string Title, string? Details);

public sealed record SelectTaskRequest(string RoomCode, string ParticipantId, string TaskId);

public sealed record CastVoteRequest(string RoomCode, string ParticipantId, string RoundId, string Estimate);

public sealed record RevealVotesRequest(string RoomCode, string ParticipantId, string RoundId);

public sealed record ResetRoundRequest(string RoomCode, string ParticipantId, string TaskId);

public sealed record StartNextRoundRequest(string RoomCode, string ParticipantId, string? TaskId);

public sealed record SaveFinalEstimateRequest(string RoomCode, string ParticipantId, string TaskId, string RoundId);

public sealed record CompleteEstimationRequest(string RoomCode, string ParticipantId);

public sealed record RoomParticipantDto(
    string ParticipantId,
    string DisplayName,
    string Role,
    string Presence,
    DateTimeOffset LastSeenAt);

public sealed record FinalEstimateDto(
    decimal Value,
    string RoundId,
    DateTimeOffset SavedAt,
    bool Archived);

public sealed record PlanningTaskDto(
    string TaskId,
    string Title,
    string Details,
    string Status,
    FinalEstimateDto? FinalEstimate);

public sealed record ParticipantVoteDto(
    string ParticipantId,
    bool HasVoted,
    string? Estimate,
    DateTimeOffset? VotedAt);

public sealed record PlanningRoundDto(
    string RoundId,
    string TaskId,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? RevealedAt,
    DateTimeOffset? ClosedAt,
    IReadOnlyList<ParticipantVoteDto> Votes,
    decimal? ComputedAverage);

public sealed record RoomPlanningSessionDto(
    IReadOnlyList<string> EstimateCards,
    IReadOnlyList<PlanningTaskDto> Tasks,
    string? CurrentTaskId,
    PlanningRoundDto? ActiveRound,
    IReadOnlyList<PlanningRoundDto> CompletedRounds,
    decimal ArchivedEstimateTotal,
    string EstimationStatus,
    decimal? CompletedTotalEstimate);

public sealed record RoomSnapshotDto(
    string RoomCode,
    string RoomName,
    string InviteUrl,
    string LocalParticipantId,
    string ResumeToken,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    long SnapshotVersion,
    IReadOnlyList<RoomParticipantDto> Participants,
    RoomPlanningSessionDto? PlanningSession);

public sealed record RoomErrorDto(string Code, string Message, string? RoomCode = null);

public sealed record RoomCommandResult(
    bool Success,
    RoomSnapshotDto? Snapshot,
    RoomErrorDto? Error,
    RoomParticipantDto? Participant = null,
    string? Event = null);

public sealed record RoomParticipantEvent(string RoomCode, RoomParticipantDto Participant);

public sealed record RoomClientSnapshot(string ConnectionId, RoomSnapshotDto Snapshot);
