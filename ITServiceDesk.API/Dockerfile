FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["ITServiceDesk.API/ITServiceDesk.API.csproj", "ITServiceDesk.API/"]
COPY ["ITServiceDesk.Core/ITServiceDesk.Core.csproj", "ITServiceDesk.Core/"]
COPY ["ITServiceDesk.Data/ITServiceDesk.Data.csproj", "ITServiceDesk.Data/"]
COPY ["ITServiceDesk.Service/ITServiceDesk.Service.csproj", "ITServiceDesk.Service/"]
RUN dotnet restore "ITServiceDesk.API/ITServiceDesk.API.csproj"

# Copy the rest of the source code and build
COPY . .
WORKDIR "/src/ITServiceDesk.API"
RUN dotnet publish "ITServiceDesk.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .

# Install curl for health probes
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*


# Create the uploads directory and set permissions for the 'app' user
RUN mkdir -p /app/App_Data/uploads && \
    chown -R app:app /app/App_Data

USER app
ENTRYPOINT ["dotnet", "ITServiceDesk.API.dll"]
