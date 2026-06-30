using System.Text.Json;
using CoffeePlanningPoker.Api.Rooms;

var builder = WebApplication.CreateBuilder(args);

var clientOrigin = builder.Configuration["ClientOrigin"] ?? "http://localhost:4200";
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

app.UseCors("ClientApp");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapHub<RoomHub>("/hubs/rooms").RequireCors("ClientApp");

app.Run();

static string[] ResolveAllowedOrigins(IConfiguration configuration, string clientOrigin)
{
    var configuredOrigins = configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
        ?? [];

    var environmentOrigins = (configuration["CorsAllowedOrigins"] ?? string.Empty)
        .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    return configuredOrigins
        .Concat(environmentOrigins)
        .Append(clientOrigin)
        .Append("http://localhost:4200")
        .Append("http://127.0.0.1:4200")
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

public partial class Program;
