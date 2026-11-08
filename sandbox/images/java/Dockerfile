FROM eclipse-temurin:21-jdk-noble
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp

COPY --chmod=755 java/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 java/run /usr/local/bin/run-program
WORKDIR /box
