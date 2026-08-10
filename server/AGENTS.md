# Server instructions

## Scope

These instructions apply to the ASP.NET Core API and tests in `server/`. Use the
repository root instructions as well.

## Architecture

- Target .NET 10 with nullable reference types enabled.
- Keep SignalR composition and HTTP/CORS configuration in
  `CoffeePlanningPoker.Api/Program.cs`; keep room contracts, hub behavior,
  validation, store behavior, and room-specific options under
  `CoffeePlanningPoker.Api/Rooms/`.
- Preserve the API as a replaceable realtime boundary for the client. Keep room
  lifecycle and planning-poker rules explicit and close to the room implementation.
- Keep the client origin and allowed CORS origins configurable as implemented in
  `Program.cs`; do not hard-code a deployment origin.

## Tests and validation

- Add focused API tests under `CoffeePlanningPoker.Api.Tests/`, following the
  existing xUnit test layout.
- From the repository root, run `dotnet restore CoffeePlanningPoker.slnx`, then
  `dotnet build CoffeePlanningPoker.slnx --configuration Release --no-restore`
  and `dotnet test CoffeePlanningPoker.slnx --configuration Release --no-build`.
