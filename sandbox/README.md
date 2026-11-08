# Code runner sandbox images

One Docker image per language. Runs on Docker's default runtime (runc); gVisor (`--runtime=runsc`) is optional extra isolation.
Published as `ghcr.io/webler-group/website-new-runner-<lang>`.

| Language    | Image    | Source file     | Toolchain / libraries                                   |
|-------------|----------|-----------------|---------------------------------------------------------|
| python      | python   | `main.py`       | Python 3.13, numpy, pandas, scipy, matplotlib (Agg)     |
| java        | java     | `Main.java`     | Temurin JDK 21                                          |
| kotlin      | kotlin   | `main.kt`       | Kotlin 2.2 on JDK 21 (stdlib only), AppCDS-warmed compiler |
| c           | c        | `main.c`        | clang 18, C17, libm (no -O, like before)                                     |
| cpp         | cpp      | `main.cpp`      | clang 18, C++20 (no -O), Boost (headers), fmt, Eigen, GLM, Mesa (OSMesa/EGL, llvmpipe) |
| typescript  | typescript | `main.ts`     | TypeScript 5.9 (strict, type errors fail the compile), Node 24, @types/node |
| nodejs      | node     | `main.js`       | Node 24                                                 |
| go          | go       | `main.go`       | Go 1.25 (stdlib only)                                   |
| rust        | rust     | `main.rs`       | rustc 1.90, edition 2024 (std only, no crates)          |
| csharp      | csharp   | `main.cs`       | .NET 10, Roslyn csc, implicit usings                    |
| ruby        | ruby     | `main.rb`       | Ruby 3.4                                                |
| lua         | lua      | `main.lua`      | Lua 5.4                                                 |

## Image contract

- The job directory is mounted at `/box` and holds the source file.
- `compile` (only in compiled languages) writes its output into `/box`. It exits non-zero on failure and prints diagnostics to stderr.
- `run` runs the program. stdin, stdout and stderr belong to the user program.
- Scripts use absolute paths, so the caller picks the working directory.
- `HOME=/tmp`. The images expect a writable tmpfs at `/tmp`, because the root filesystem is read-only.

## Run flags

Compile step: `/box` is writable, and `/tmp` is larger because Go copies its warmed build cache there.

```
docker run --rm --network=none --read-only \
  --cap-drop=ALL --security-opt=no-new-privileges --user 65534 --label website-new-runner \
  --ulimit core=0 --ulimit nofile=256 --ulimit fsize=67108864 \
  --memory=1g --memory-swap=1g --cpus=1 --pids-limit=256 --tmpfs /tmp:size=256m,exec \
  -v <jobdir>:/box -w /box <image> compile
```

Run step: `/box` is read-only, so a program can't fill the host disk. Its only scratch space is the size-limited `/tmp`.

```
docker run --rm -i --network=none --read-only \
  --cap-drop=ALL --security-opt=no-new-privileges --user 65534 --label website-new-runner \
  --ulimit core=0 --ulimit nofile=256 --ulimit fsize=67108864 \
  --memory=512m --memory-swap=512m --cpus=1 --pids-limit=128 --tmpfs /tmp:size=64m \
  -v <jobdir>:/box:ro -w /tmp <image> run
```

`<jobdir>` must be writable by uid 65534, for example via `chmod 777` or by chowning it to 65534.

What each extra flag does:
- `--memory-swap` equal to `--memory` turns off swap, so the memory limit is a real limit.
- `--ulimit fsize` caps the size of any single file a program writes, like isolate's `--fsize`.
- `--ulimit nofile` caps open files.
- `--ulimit core=0` turns off core dumps.

Docker's default seccomp and AppArmor profiles stay on.

To add gVisor later, run `sudo ./setup-host.sh` and add `--runtime=runsc` to both commands. Nothing else changes.

## Local workflow

```
./build.sh                # build all images (or: ./build.sh python cpp)
./test.sh                 # smoke-test with the production flags (RUNTIME=runsc ./test.sh for gVisor)
```

Docker Desktop on WSL works for development but occasionally loses the job folder between the compile and run containers. Use Docker Engine installed directly on Linux in production.

To add a library, edit the image's Dockerfile (or `python/requirements.txt`), rebuild and push. Nothing changes on the host.
