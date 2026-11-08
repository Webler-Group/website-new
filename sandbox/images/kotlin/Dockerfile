FROM eclipse-temurin:21-jdk-noble
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ARG KOTLIN_VERSION=2.2.20

ENV HOME=/tmp \
    KOTLIN_HOME=/opt/kotlinc \
    KOTLINC_JAVA_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:-UsePerfData -Xss8m"

RUN apt-get update && apt-get install -y --no-install-recommends unzip \
 && curl -fsSL -o /tmp/kotlin.zip \
      "https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip" \
 && unzip -q /tmp/kotlin.zip -d /opt \
 && rm /tmp/kotlin.zip \
 && apt-get purge -y unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Record the classes kotlinc loads into a CDS archive, so each compile starts faster
COPY kotlin/warmup.kt /opt/runner/warmup.kt
RUN JAVA_OPTS="$KOTLINC_JAVA_OPTS -XX:ArchiveClassesAtExit=/opt/runner/kotlinc.jsa" \
      "$KOTLIN_HOME/bin/kotlinc" -nowarn -d /tmp/warmup.jar /opt/runner/warmup.kt 2>/dev/null \
 && rm /tmp/warmup.jar && chmod 644 /opt/runner/kotlinc.jsa

COPY --chmod=755 kotlin/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 kotlin/run /usr/local/bin/run-program
WORKDIR /box
