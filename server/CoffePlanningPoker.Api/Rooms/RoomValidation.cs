using System.Text.RegularExpressions;

namespace CoffePlanningPoker.Api.Rooms;

public static partial class RoomValidation
{
    public static string NormalizeRoomCode(string value) =>
        value.Trim().ToUpperInvariant();

    public static bool IsValidRoomName(string value)
    {
        var normalized = value.Trim();
        return normalized.Length is >= 3 and <= 80;
    }

    public static bool IsValidDisplayName(string value)
    {
        var normalized = value.Trim();
        return normalized.Length is >= 2 and <= 40;
    }

    public static bool IsValidRoomCode(string value)
    {
        var normalized = NormalizeRoomCode(value);
        return RoomCodePattern().IsMatch(normalized);
    }

    [GeneratedRegex("^[A-Z0-9]{3,8}(-[A-Z0-9]{2,8})?$")]
    private static partial Regex RoomCodePattern();
}
