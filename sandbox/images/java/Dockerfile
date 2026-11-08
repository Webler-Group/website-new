FROM eclipse-temurin:21-jdk-noble
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp

COPY --chmod=755 compile /usr/local/bin/compile
COPY --chmod=755 run /usr/local/bin/run
WORKDIR /box
