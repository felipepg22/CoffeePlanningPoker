namespace CoffeePlanningPoker.Api.Rooms;

public sealed record RoomStoreOptions(string ClientOrigin, TimeSpan RoomTtl);

public interface IRoomClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemRoomClock : IRoomClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
