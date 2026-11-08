FROM rust:1.90-slim-trixie
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    TMPDIR=/tmp

# Call the real rustc directly instead of the rustup proxy (faster, no writes to RUSTUP_HOME).
RUN ln -s "$(rustc --print sysroot)/bin/rustc" /usr/local/bin/rustc-real

COPY --chmod=755 rust/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 rust/run /usr/local/bin/run-program
WORKDIR /box
