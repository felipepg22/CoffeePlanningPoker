namespace CoffeePlanningPoker.Api.Rooms;

public static class RoomErrorCodes
{
    public const string InvalidRoomName = "invalid_room_name";
    public const string InvalidDisplayName = "invalid_display_name";
    public const string InvalidRoomCode = "invalid_room_code";
    public const string RoomUnavailable = "room_unavailable";
    public const string ResumeRejected = "resume_rejected";
    public const string DuplicateJoinRejected = "duplicate_join_rejected";
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

public sealed record CreateRoomRequest(string RoomName, string ParticipantId, string DisplayName);

public sealed record JoinRoomRequest(string RoomCode, string ParticipantId, string DisplayName);

public sealed record ResumeRoomRequest(string RoomCode, string ParticipantId, string ResumeToken);

public sealed record LeaveRoomRequest(string RoomCode, string ParticipantId);

public sealed record HeartbeatRequest(string RoomCode, string ParticipantId);

public sealed record RoomParticipantDto(
    string ParticipantId,
    string DisplayName,
    string Role,
    string Presence,
    DateTimeOffset LastSeenAt);

public sealed record RoomSnapshotDto(
    string RoomCode,
    string RoomName,
    string InviteUrl,
    string LocalParticipantId,
    string ResumeToken,
    DateTimeOffset CreatedAt,
    IReadOnlyList<RoomParticipantDto> Participants);

public sealed record RoomErrorDto(string Code, string Message, string? RoomCode = null);

public sealed record RoomCommandResult(
    bool Success,
    RoomSnapshotDto? Snapshot,
    RoomErrorDto? Error,
    RoomParticipantDto? Participant = null,
    string? Event = null);

public sealed record RoomParticipantEvent(string RoomCode, RoomParticipantDto Participant);
