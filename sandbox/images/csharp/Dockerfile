# Compile with Roslyn (csc) directly instead of `dotnet build`: no project, no NuGet restore
# (which would need network), and a much smaller final image built on the runtime image.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS sdk
RUN set -e; mkdir -p /out \
 && cp -r "$(ls -d /usr/share/dotnet/sdk/*/Roslyn/bincore | head -n1)" /out/roslyn \
 && cp -r "$(ls -d /usr/share/dotnet/packs/Microsoft.NETCore.App.Ref/*/ref/net10.0 | head -n1)" /out/ref \
 && test -f /out/roslyn/csc.dll \
 && { echo "-nologo"; echo "-optimize+"; echo "-langversion:latest"; echo "-target:exe"; \
      for f in /out/ref/*.dll; do echo "-r:/opt/runner/ref/$(basename "$f")"; done; } > /out/csc.rsp

FROM mcr.microsoft.com/dotnet/runtime:10.0
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_EnableDiagnostics=0 \
    DOTNET_gcServer=0

COPY --from=sdk /out /opt/runner
COPY csharp/GlobalUsings.cs csharp/main.runtimeconfig.json /opt/runner/
COPY --chmod=755 csharp/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 csharp/run /usr/local/bin/run-program
WORKDIR /box
