FROM debian:trixie-slim
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp

RUN apt-get update && apt-get install -y --no-install-recommends lua5.4 \
 && rm -rf /var/lib/apt/lists/*

COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 lua/run /usr/local/bin/run-program
WORKDIR /box
