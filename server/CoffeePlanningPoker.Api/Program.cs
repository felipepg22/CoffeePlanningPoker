using System.Text.Json;
using CoffeePlanningPoker.Api.Rooms;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularDev", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddSingleton(new RoomStoreOptions(
    ClientOrigin: "http://localhost:4200",
    RoomTtl: TimeSpan.FromHours(2)));
builder.Services.AddSingleton<IRoomClock, SystemRoomClock>();
builder.Services.AddSingleton<InMemoryRoomStore>();
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

var app = builder.Build();

app.UseCors("AngularDev");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapHub<RoomHub>("/hubs/rooms").RequireCors("AngularDev");

app.Run();

public partial class Program;
