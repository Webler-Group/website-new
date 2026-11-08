FROM rust:1.90-slim-trixie
LABEL org.opencontainers.image.source=https://github.com/Webler-Group/website-new

ENV HOME=/tmp \
    TMPDIR=/tmp \
    LIBGL_ALWAYS_SOFTWARE=1 \
    GALLIUM_DRIVER=llvmpipe \
    LP_NUM_THREADS=1

# Mesa's OSMesa + llvmpipe for offscreen OpenGL (the `osmesa` crate links libOSMesa)
RUN apt-get update && apt-get install -y --no-install-recommends libosmesa6-dev libgl1-mesa-dri \
 && rm -rf /var/lib/apt/lists/*

# Call the real rustc directly instead of the rustup proxy (faster, no writes to RUSTUP_HOME).
RUN ln -s "$(rustc --print sysroot)/bin/rustc" /usr/local/bin/rustc-real

# Pre-build the crates in crates/Cargo.toml. User programs are compiled with plain rustc, which gets
# `--extern <crate>=<rlib>` for each direct dependency and `-L` for their dependencies, so
# `use image::...` just works. Only the compiled libraries are kept (.rlib, plus .so for proc-macro
# dependencies such as nalgebra-macros), not the sources or registry.
COPY rust/crates /tmp/crates
RUN cd /tmp/crates \
 && cargo build --release --message-format=json > /tmp/build.json \
 && mkdir -p /opt/runner/deps \
 && cp target/release/deps/*.rlib target/release/deps/*.so /opt/runner/deps/ \
 && for crate in image imageproc gl osmesa; do \
      rlib=$(grep '"reason":"compiler-artifact"' /tmp/build.json \
             | grep "\"name\":\"$crate\",\"src_path\"" | tail -n1 \
             | grep -o "[^\"]*/lib${crate}-[0-9a-f]*\.rlib"); \
      test -n "$rlib" || { echo "no rlib for $crate" >&2; exit 1; }; \
      echo "--extern $crate=/opt/runner/deps/$(basename "$rlib")"; \
    done > /opt/runner/externs \
 && cat /opt/runner/externs \
 && rm -rf /tmp/crates /tmp/build.json "$CARGO_HOME/registry" \
 && chmod -R a+rX /opt/runner

COPY --chmod=755 rust/compile /usr/local/bin/compile
COPY --chmod=755 common/run /usr/local/bin/run
COPY --chmod=755 rust/run /usr/local/bin/run-program
WORKDIR /box
