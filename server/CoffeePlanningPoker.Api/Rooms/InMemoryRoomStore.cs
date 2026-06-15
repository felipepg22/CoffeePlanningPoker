using System.Security.Cryptography;

namespace CoffeePlanningPoker.Api.Rooms;

public sealed class InMemoryRoomStore(RoomStoreOptions options, IRoomClock clock)
{
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
                LastActivityAt: now);
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
            room.LastActivityAt = now;
            connections[connectionId] = new ConnectionAnchor(roomCode, participant.ParticipantId);

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
            room.LastActivityAt = now;
            connections[connectionId] = new ConnectionAnchor(roomCode, participant.ParticipantId);

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
            room.LastActivityAt = participant.LastSeenAt;
            connections.Remove(connectionId);

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
            room.LastActivityAt = participant.LastSeenAt;
            connections[connectionId] = new ConnectionAnchor(roomCode, participant.ParticipantId);

            return Success(room, participant);
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
                room.LastActivityAt = participant.LastSeenAt;
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
            room.Participants.Values
                .OrderBy(participant => participant.Role == ParticipantRoles.Facilitator ? 0 : 1)
                .ThenBy(participant => participant.DisplayName, StringComparer.OrdinalIgnoreCase)
                .Select(ToDto)
                .ToArray());

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
        DateTimeOffset LastActivityAt)
    {
        public string RoomCode { get; } = RoomCode;
        public string RoomName { get; } = RoomName;
        public DateTimeOffset CreatedAt { get; } = CreatedAt;
        public DateTimeOffset LastActivityAt { get; set; } = LastActivityAt;
        public Dictionary<string, ParticipantState> Participants { get; } = new(StringComparer.Ordinal);
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
}
