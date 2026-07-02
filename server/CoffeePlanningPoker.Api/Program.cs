using System.Text.Json;
using CoffeePlanningPoker.Api.Rooms;

var builder = WebApplication.CreateBuilder(args);

var clientOrigin = ResolveClientOrigin(builder.Configuration);
var allowedOrigins = ResolveAllowedOrigins(builder.Configuration, clientOrigin);

builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientApp", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSingleton(new RoomStoreOptions(
    ClientOrigin: clientOrigin,
    RoomTtl: TimeSpan.FromHours(2)));
builder.Services.AddSingleton<IRoomClock, SystemRoomClock>();
builder.Services.AddSingleton<InMemoryRoomStore>();
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

var app = builder.Build();

app.Logger.LogInformation("Client origin configured as {ClientOrigin}", clientOrigin);
app.Logger.LogInformation("CORS allowed origins: {AllowedOrigins}", string.Join(", ", allowedOrigins));

app.UseCors("ClientApp");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/config", () => Results.Ok(new
{
    status = "ok",
    clientOrigin,
    allowedOrigins,
    corsAllowedOriginsConfigured = !string.IsNullOrWhiteSpace(app.Configuration["CorsAllowedOrigins"])
        || !string.IsNullOrWhiteSpace(app.Configuration["CORS_ALLOWED_ORIGINS"])
        || app.Configuration.GetSection("Cors:AllowedOrigins").Exists()
}));
app.MapHub<RoomHub>("/hubs/rooms").RequireCors("ClientApp");

app.Run();

static string ResolveClientOrigin(IConfiguration configuration)
{
    var configuredOrigin = configuration["ClientOrigin"]
        ?? configuration["CLIENT_ORIGIN"]
        ?? "http://localhost:4200";

    return NormalizeOrigin(configuredOrigin) ?? "http://localhost:4200";
}

static string[] ResolveAllowedOrigins(IConfiguration configuration, string clientOrigin)
{
    var configuredOrigins = configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
        ?? [];

    var environmentOrigins = SplitOrigins(configuration["CorsAllowedOrigins"])
        .Concat(SplitOrigins(configuration["CORS_ALLOWED_ORIGINS"]));

    return configuredOrigins
        .Concat(environmentOrigins)
        .Append(clientOrigin)
        .Append("http://localhost:4200")
        .Append("http://127.0.0.1:4200")
        .Select(NormalizeOrigin)
        .OfType<string>()
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

static string[] SplitOrigins(string? origins)
{
    return (origins ?? string.Empty)
        .Split([';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

static string? NormalizeOrigin(string? origin)
{
    if (string.IsNullOrWhiteSpace(origin))
    {
        return null;
    }

    if (!Uri.TryCreate(origin.Trim(), UriKind.Absolute, out var uri))
    {
        return null;
    }

    return uri.IsDefaultPort
        ? $"{uri.Scheme}://{uri.Host}"
        : $"{uri.Scheme}://{uri.Host}:{uri.Port}";
}

public partial class Program;
