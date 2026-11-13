# Code runner sandbox images

One Docker image per language. Runs on Docker's default runtime (runc); gVisor (`--runtime=runsc`) is optional extra isolation.
Published as `ghcr.io/webler-group/website-new-runner-<lang>`.

| Language    | Image    | Source file     | Toolchain / libraries                                   |
|-------------|----------|-----------------|---------------------------------------------------------|
| python      | python   | `main.py`       | Python 3.13, numpy, pandas, scipy, matplotlib (Agg), Pillow |
| java        | java     | `Main.java`     | Temurin JDK 21                                          |
| kotlin      | kotlin   | `main.kt`       | Kotlin 2.2 on JDK 21 (stdlib only), AppCDS-warmed compiler |
| c           | c        | `main.c`        | clang 18, C17, libm (no -O, like before)                                     |
| cpp         | cpp      | `main.cpp`      | clang 18, C++20 (no -O), Boost (headers), fmt, Eigen, GLM, stb, Mesa (OSMesa/EGL, llvmpipe) |
| typescript  | typescript | `main.ts`     | TypeScript 5.9 (strict, type errors fail the compile), Node 24, @types/node |
| nodejs      | node     | `main.js`       | Node 24                                                 |
| go          | go       | `main.go`       | Go 1.25 (stdlib only)                                   |
| rust        | rust     | `main.rs`       | rustc 1.90, edition 2024, pre-built crates: `image` (PNG), `imageproc`, `gl`, `osmesa`; Mesa (OSMesa, llvmpipe) |
| csharp      | csharp   | `main.cs`       | .NET 10, Roslyn csc, implicit usings                    |
| ruby        | ruby     | `main.rb`       | Ruby 3.4                                                |
| lua         | lua      | `main.lua`      | Lua 5.4                                                 |

## Image contract

- The job directory is mounted at `/box` and holds the source file.
- `compile` (only in compiled languages) writes its output into `/box`. It exits non-zero on failure and prints diagnostics to stderr.
- `run` is the shared wrapper `images/common/run`. It runs the language's `run-program`, then appends the program's images and measurements to stdout (see below). stdin, stdout and stderr otherwise belong to the user program.
- Scripts use absolute paths, so the caller picks the working directory.
- `HOME=/tmp`. The images expect a writable tmpfs at `/tmp`, because the root filesystem is read-only.

## Image output

Programs in any language can save a PNG file into `output/` (relative to the working directory `/tmp`). After the program exits, `run` writes a marker line `--website-new-images--` and then one `IMAGE <name> <bytes>` line plus a base64 line for the image. The backend splits stdout at the last marker and checks the image before returning it with the run result.

| Limit | Value |
|---|---|
| Number of images | 1 per run (the first by name; others are ignored with a note in stderr) |
| Image size | 1 MB |
| Width and height | 4096 px |
| File names | letters, digits, `.`, `_`, `-` |

If the program is killed (time or output limit), no image is returned.

## Measurements

The last line after the marker is `STATS <cpu> <wall> <memory>`, measured by the wrapper for the program alone (container start-up, the wrapper and the image encoding are not counted; the language runtime's own start-up is):

| Field | Meaning |
|---|---|
| `cpu` | CPU time (user + system) of the program and the processes it waited for, in microseconds |
| `wall` | Wall time of the program, in milliseconds (10 ms resolution) |
| `memory` | Peak resident memory of the largest process, in KB, or `-` if unavailable |

The values come from `getrusage(RUSAGE_CHILDREN)`, called by raw syscall number from perl (x86_64 and aarch64). The backend uses `cpu` as the test's time and compares it, and `memory`, with a challenge's limits. Images without the STATS line still work: the backend then falls back to the container's start-to-finish time and reports no memory.

Python: `plt.savefig("output/plot.png")`, or draw pixels with Pillow:

```python
from PIL import Image, ImageDraw
img = Image.new("RGB", (320, 240), (30, 30, 60))
ImageDraw.Draw(img).ellipse((100, 60, 220, 180), fill=(255, 200, 0))
img.save("output/frame.png")
```

Rust: the `image`, `imageproc`, `gl` and `osmesa` crates are pre-built into the image (no Cargo.toml needed). `osmesa` is our own small crate (`images/rust/crates/osmesa`) with the same names as `<GL/osmesa.h>`. To add a crate, list it in `images/rust/crates/Cargo.toml` and add its name to the `for crate in ...` loop in the Rust Dockerfile.

```rust
use image::{Rgb, RgbImage};
use imageproc::drawing::draw_filled_circle_mut;

fn main() {
    let mut img = RgbImage::from_pixel(320, 240, Rgb([30, 30, 60]));
    draw_filled_circle_mut(&mut img, (160, 120), 60, Rgb([255, 200, 0]));
    img.save("output/frame.png").unwrap();
}
```

Rust with OpenGL, the same way as C++ (core profile up to GL 4.5):

```rust
let (w, h) = (320usize, 240usize);
let mut pixels = vec![0u8; w * h * 4];
let attribs = [osmesa::OSMESA_FORMAT, osmesa::OSMESA_RGBA as i32, osmesa::OSMESA_DEPTH_BITS, 24,
    osmesa::OSMESA_PROFILE, osmesa::OSMESA_CORE_PROFILE,
    osmesa::OSMESA_CONTEXT_MAJOR_VERSION, 3, osmesa::OSMESA_CONTEXT_MINOR_VERSION, 3, 0];
unsafe {
    let ctx = osmesa::OSMesaCreateContextAttribs(attribs.as_ptr(), std::ptr::null_mut());
    osmesa::OSMesaMakeCurrent(ctx, pixels.as_mut_ptr().cast(), osmesa::GL_UNSIGNED_BYTE, w as i32, h as i32);
    gl::load_with(osmesa::get_proc_address);
    // gl::CreateShader, gl::GenVertexArrays, gl::DrawArrays, ...
}
// OpenGL's origin is bottom-left, PNG's is top-left
let img = image::RgbaImage::from_raw(w as u32, h as u32, pixels).unwrap();
image::imageops::flip_vertical(&img).save("output/frame.png").unwrap();
```

C++ with OpenGL: render offscreen with OSMesa and save with stb (`libstb` is linked, so no `#define` is needed):

```cpp
#include <GL/osmesa.h>
#include <GL/gl.h>
#include <stb/stb_image_write.h>
#include <vector>

int main() {
    const int W = 320, H = 240;
    std::vector<unsigned char> pixels(W * H * 4);
    OSMesaContext ctx = OSMesaCreateContext(OSMESA_RGBA, nullptr);
    OSMesaMakeCurrent(ctx, pixels.data(), GL_UNSIGNED_BYTE, W, H);   // the draw buffer

    glClearColor(0.1f, 0.1f, 0.2f, 1);
    glClear(GL_COLOR_BUFFER_BIT);
    // ... draw ...
    glFinish();

    stbi_flip_vertically_on_write(1);   // OpenGL's origin is bottom-left
    stbi_write_png("output/frame.png", W, H, 4, pixels.data(), W * 4);
    OSMesaDestroyContext(ctx);
}
```

Modern OpenGL (shaders, buffers, vertex arrays, up to GL 4.5 core) needs no loader: programs are compiled with `GL_GLEXT_PROTOTYPES`, so `<GL/gl.h>` declares every function, and OSMesa provides them. Tutorial code that uses glad or GLEW works after removing the loader's `#include` and init call. For a core-profile context, use `OSMesaCreateContextAttribs`:

```cpp
const int attribs[] = { OSMESA_FORMAT, OSMESA_RGBA, OSMESA_DEPTH_BITS, 24,
    OSMESA_PROFILE, OSMESA_CORE_PROFILE,
    OSMESA_CONTEXT_MAJOR_VERSION, 3, OSMESA_CONTEXT_MINOR_VERSION, 3, 0 };
OSMesaContext ctx = OSMesaCreateContextAttribs(attribs, nullptr);
OSMesaMakeCurrent(ctx, pixels.data(), GL_UNSIGNED_BYTE, W, H);
// glCreateShader, glGenVertexArrays, glDrawArrays, ...
```

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
./build.sh                # build all images (or: ./build.sh python cpp); the build context is images/
./test.sh                 # smoke-test with the production flags (RUNTIME=runsc ./test.sh for gVisor)
```

Docker Desktop on WSL works for development but occasionally loses the job folder between the compile and run containers. Use Docker Engine installed directly on Linux in production.

To add a library, edit the image's Dockerfile (or `python/requirements.txt`), rebuild and push. Nothing changes on the host.
