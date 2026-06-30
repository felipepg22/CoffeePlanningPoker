# syntax=docker/dockerfile:1.7

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY CoffeePlanningPoker.Api/CoffeePlanningPoker.Api.csproj CoffeePlanningPoker.Api/
RUN dotnet restore CoffeePlanningPoker.Api/CoffeePlanningPoker.Api.csproj

COPY CoffeePlanningPoker.Api/ CoffeePlanningPoker.Api/
RUN dotnet publish CoffeePlanningPoker.Api/CoffeePlanningPoker.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime

WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "CoffeePlanningPoker.Api.dll"]
