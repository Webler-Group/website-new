FROM ubuntu:24.04
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
        clang-18 libc6-dev binutils \
 && rm -rf /var/lib/apt/lists/*

COPY --chmod=755 c/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 c/run /usr/local/bin/run-program
WORKDIR /box
