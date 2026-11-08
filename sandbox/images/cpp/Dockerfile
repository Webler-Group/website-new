FROM ubuntu:24.04
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    DEBIAN_FRONTEND=noninteractive \
    LIBGL_ALWAYS_SOFTWARE=1 \
    GALLIUM_DRIVER=llvmpipe \
    LP_NUM_THREADS=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        clang-18 libstdc++-13-dev libc6-dev binutils \
        libboost-dev libfmt-dev libeigen3-dev libglm-dev libstb-dev \
        libgl-dev libegl-dev libglu1-mesa-dev libosmesa6-dev \
        libgl1-mesa-dri libegl-mesa0 \
 && rm -rf /var/lib/apt/lists/*

COPY --chmod=755 cpp/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 cpp/run /usr/local/bin/run-program
WORKDIR /box
