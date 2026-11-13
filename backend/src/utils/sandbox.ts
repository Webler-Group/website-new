import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { config } from "../confg";

/*
 * Runs untrusted code in Docker containers built from sandbox/images.
 *
 * Each job gets a fresh job directory mounted at /box. The `compile` step (compiled languages only)
 * runs with /box writable. Every input then gets its own `run` container with /box read-only,
 * so a program can't affect the next test case or fill the host disk.
 */

interface LanguageSpec {
    image: string;
    sourceFile: string;
    compiled: boolean;
}

const LANGUAGES: Record<string, LanguageSpec> = {
    c: { image: "c", sourceFile: "main.c", compiled: true },
    cpp: { image: "cpp", sourceFile: "main.cpp", compiled: true },
    csharp: { image: "csharp", sourceFile: "main.cs", compiled: true },
    go: { image: "go", sourceFile: "main.go", compiled: true },
    java: { image: "java", sourceFile: "Main.java", compiled: true },
    kotlin: { image: "kotlin", sourceFile: "main.kt", compiled: true },
    typescript: { image: "typescript", sourceFile: "main.ts", compiled: true },
    rust: { image: "rust", sourceFile: "main.rs", compiled: true },
    python: { image: "python", sourceFile: "main.py", compiled: false },
    nodejs: { image: "node", sourceFile: "main.js", compiled: false },
    ruby: { image: "ruby", sourceFile: "main.rb", compiled: false },
    lua: { image: "lua", sourceFile: "main.lua", compiled: false }
};

// Run limits (seconds). CPU time is enforced by the kernel (RLIMIT_CPU), wall time by us.
// A challenge can set a lower time limit (see RunLimits).
const RUN_CPU_TIME = 10;
const RUN_WALL_TIME = 10;
const COMPILE_WALL_TIME = 10;
// Allowance for container start/stop on top of the program's own wall time before we kill it
const CONTAINER_GRACE = 2;

const COMPILE_MEMORY = "1g";
const COMPILE_FSIZE_BYTES = 64 * 1024 * 1024;

const LABEL = "website-new-runner";
const WORKER_LABEL = `${LABEL}.worker`;

// Exit codes the container reports when the program is killed by a signal (128 + signal)
const EXIT_SIGKILL = 137;
const EXIT_SIGSEGV = 139;
const EXIT_SIGXCPU = 152;
const EXIT_SIGXFSZ = 153;

// The PNG file a program saves into ./output comes back after this marker on stdout
// (written by the images' shared `run` wrapper, sandbox/images/common/run)
const IMAGE_MARKER = Buffer.from("\n--website-new-images--\n");
const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;
// Upper bound for the marker + base64 image section, so we know how much of stdout's end to keep
const IMAGE_SECTION_MAX = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128 + IMAGE_MARKER.length;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface SandboxImage {
    name: string;
    width: number;
    height: number;
    // Base64-encoded PNG
    data: string;
}

/** Optional per-run limits (a challenge's limits); the global run limits always apply as well. */
export interface RunLimits {
    // Milliseconds of CPU time
    timeLimit?: number;
    // Megabytes of peak memory (resident set size)
    memoryLimit?: number;
}

export type RunVerdict = "timeLimitExceeded" | "memoryLimitExceeded" | "outputLimitExceeded" | "runtimeError";

export interface SandboxRunResult {
    stdout: string;
    stderr: string;
    // Seconds of CPU time the program used (container start-up excluded)
    time?: number;
    // Peak memory in KB
    memory?: number;
    // Why the run failed, when it did
    verdict?: RunVerdict;
    // PNG file the program saved into ./output
    image?: SandboxImage;
    // Crashed or hit a limit; later inputs were not run
    failed?: boolean;
}

export interface SandboxResult {
    compileErr: string;
    runResults: SandboxRunResult[];
}

export function isSupportedLanguage(language: string) {
    return language in LANGUAGES;
}

function imageFor(language: string) {
    return `${config.runnerImagePrefix}-${LANGUAGES[language].image}:${config.runnerImageTag}`;
}

function workerJobsDir() {
    return path.join(config.runnerJobsDir, `worker-${config.codeRunnerWorkerId}`);
}

/* ------------------------------------------------------------------ */
/* Process helpers                                                      */
/* ------------------------------------------------------------------ */

/** Keeps the first `limit` bytes of a stream and counts the rest. */
class CappedOutput {
    private chunks: Buffer[] = [];
    private kept = 0;
    total = 0;

    constructor(private limit: number) { }

    push(chunk: Buffer) {
        this.total += chunk.length;
        if (this.kept < this.limit) {
            const part = chunk.subarray(0, this.limit - this.kept);
            this.chunks.push(part);
            this.kept += part.length;
        }
    }

    /** `length` limits the result to the first bytes of the stream (e.g. before the image section). */
    toString(length = this.total) {
        const text = Buffer.concat(this.chunks).subarray(0, length).toString("utf-8");
        return length > this.limit ? text + "[Output truncated]" : text;
    }
}

/**
 * Captures stdout of a `run` container: keeps the first `limit` bytes for the user, plus the last
 * IMAGE_SECTION_MAX bytes so the image section at the very end survives however much was printed.
 */
class RunStdout {
    private head: CappedOutput;
    private tail: Buffer[] = [];
    private tailLength = 0;

    constructor(limit: number) {
        this.head = new CappedOutput(limit);
    }

    get total() {
        return this.head.total;
    }

    push(chunk: Buffer) {
        this.head.push(chunk);
        this.tail.push(chunk);
        this.tailLength += chunk.length;
        while (this.tail.length > 1 && this.tailLength - this.tail[0].length >= IMAGE_SECTION_MAX) {
            this.tailLength -= this.tail.shift()!.length;
        }
    }

    /** Splits the stream into the program's own output and the image section after the last marker. */
    split(): { stdout: string; imageSection: Buffer | null } {
        const tail = Buffer.concat(this.tail);
        const index = tail.lastIndexOf(IMAGE_MARKER);
        if (index < 0) {
            // Killed before the wrapper finished (timeout, output limit): everything is program output
            return { stdout: this.head.toString(), imageSection: null };
        }
        const programBytes = this.total - (tail.length - index);
        return {
            stdout: this.head.toString(programBytes),
            imageSection: tail.subarray(index + IMAGE_MARKER.length)
        };
    }
}

interface RunStats {
    // Seconds of CPU time (user + system)
    cpuTime: number;
    // Peak memory in KB
    memory?: number;
}

/**
 * Parses the section written by the `run` wrapper after the marker: at most one image
 * (`IMAGE <name> <bytes>` + base64 line) and the program's measurements (`STATS ...`, last line).
 * Images built before the STATS line existed simply have no stats.
 */
function parseImageSection(section: Buffer): { image?: SandboxImage; warning: string; stats?: RunStats } {
    const lines = section.toString("latin1").split("\n");
    const statsMatch = lines
        .map(line => /^STATS (\d+) (\d+) (\d+|-)$/.exec(line))
        .find(match => match !== null);
    const stats = statsMatch ? {
        cpuTime: Number(statsMatch[1]) / 1_000_000,
        memory: statsMatch[3] === "-" ? undefined : Number(statsMatch[3])
    } : undefined;
    return { ...parseImage(lines[0] ?? "", lines[1] ?? ""), stats };
}

/** Validates the image from the image section (at most one image). */
function parseImage(headerLine: string, base64: string): { image?: SandboxImage; warning: string } {
    const header = /^IMAGE ([A-Za-z0-9._-]{1,100}\.png) (\d+)$/.exec(headerLine);
    if (!header) {
        return { warning: "" };
    }

    const name = header[1];
    const data = Buffer.from(base64, "base64");

    if (data.length !== Number(header[2]) || data.length > MAX_IMAGE_BYTES) {
        return { warning: `output/${name} skipped: incomplete or too large\n` };
    }
    if (data.length < 24 || !data.subarray(0, 8).equals(PNG_SIGNATURE)) {
        return { warning: `output/${name} skipped: not a valid PNG file\n` };
    }
    // IHDR is always the first chunk: width and height are big-endian at bytes 16 and 20
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    if (width === 0 || height === 0 || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        return { warning: `output/${name} skipped: images must be at most ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels\n` };
    }

    return { image: { name, width, height, data: data.toString("base64") }, warning: "" };
}

/** Runs a docker CLI command to completion and returns its output. */
function docker(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", d => stdout += d);
        child.stderr.on("data", d => stderr += d);
        child.on("error", reject);
        child.on("close", code => resolve({ code, stdout, stderr }));
    });
}

function parseDockerTime(value: string): number | undefined {
    // RFC 3339 with nanoseconds, e.g. 2026-11-08T12:31:53.3781607Z (Date only parses milliseconds)
    const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(\.\d+)?Z$/.exec(value);
    if (!match || match[1].startsWith("0001")) return undefined;
    return Date.parse(match[1] + "Z") + (match[2] ? Number(match[2]) * 1000 : 0);
}

interface ContainerOptions {
    image: string;
    command: string;
    flags: string[];
    input?: string | Buffer;
    wallTime: number;
    outputLimit: number;
    // Kill the container once stdout + stderr exceed this many bytes
    outputKillLimit: number;
    // Split the image saved by the program off the end of stdout (run step)
    collectImage?: boolean;
}

interface ContainerResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    oomKilled: boolean;
    timedOut: boolean;
    outputExceeded: boolean;
    image?: SandboxImage;
    // Seconds of CPU time the program used, measured by the `run` wrapper; for images without
    // the wrapper's STATS line, seconds between the container starting and exiting
    time?: number;
    // `time` and `memory` come from the `run` wrapper (not from Docker)
    measured: boolean;
    // Peak memory in KB, measured by the `run` wrapper
    memory?: number;
}

/** Docker itself failed to start the container (not the user's program). */
class ContainerStartError extends Error { }

async function runContainer(opts: ContainerOptions): Promise<ContainerResult> {
    try {
        return await runContainerOnce(opts);
    } catch (err) {
        // Start failures are usually transient (e.g. Docker Desktop bind mount races), so retry once
        if (err instanceof ContainerStartError) {
            console.warn(`Retrying container: ${err.message}`);
            return await runContainerOnce(opts);
        }
        throw err;
    }
}

async function runContainerOnce(opts: ContainerOptions): Promise<ContainerResult> {
    const name = `${LABEL}-${config.codeRunnerWorkerId}-${crypto.randomUUID()}`;
    const stdout = opts.collectImage ? new RunStdout(opts.outputLimit) : new CappedOutput(opts.outputLimit);
    const stderr = new CappedOutput(opts.outputLimit);
    let timedOut = false;
    let outputExceeded = false;
    let killed = false;

    const kill = () => {
        if (killed) return;
        killed = true;
        docker(["kill", name]).catch(() => { });
    };

    try {
        const cliExit = await new Promise<number | null>((resolve, reject) => {
            const child = spawn("docker", [
                "run", "--name", name, "-i", ...opts.flags, opts.image, opts.command
            ], { stdio: ["pipe", "pipe", "pipe"] });

            const onOutput = (target: CappedOutput | RunStdout) => (chunk: Buffer) => {
                target.push(chunk);
                if (stdout.total + stderr.total > opts.outputKillLimit) {
                    outputExceeded = true;
                    kill();
                }
            };
            child.stdout.on("data", onOutput(stdout));
            child.stderr.on("data", onOutput(stderr));

            const timer = setTimeout(() => {
                timedOut = true;
                kill();
            }, (opts.wallTime + CONTAINER_GRACE) * 1000);
            // Last resort if `docker kill` didn't take: drop the CLI, the container is removed below
            const hardTimer = setTimeout(() => child.kill("SIGKILL"), (opts.wallTime + CONTAINER_GRACE + 10) * 1000);

            child.on("error", reject);
            child.on("close", code => {
                clearTimeout(timer);
                clearTimeout(hardTimer);
                resolve(code);
            });

            // The program may exit without reading its input
            child.stdin.on("error", () => { });
            child.stdin.end(opts.input ?? "");
        });

        const inspect = await docker(["inspect", "--format", "{{json .State}}", name]);
        if (inspect.code !== 0) {
            // The container was never created: bad image, daemon down, ...
            throw new ContainerStartError(`docker run failed (${cliExit}): ${stderr.toString().trim() || inspect.stderr.trim()}`);
        }
        const state = JSON.parse(inspect.stdout);
        if (state.Error) {
            throw new ContainerStartError(`container failed to start: ${state.Error}`);
        }
        const started = parseDockerTime(state.StartedAt);
        const finished = parseDockerTime(state.FinishedAt);

        const out = stdout instanceof RunStdout ? stdout.split() : { stdout: stdout.toString(), imageSection: null };
        const { image, warning, stats } = out.imageSection
            ? parseImageSection(out.imageSection)
            : { image: undefined, warning: "", stats: undefined };

        return {
            stdout: out.stdout,
            stderr: stderr.toString() + warning,
            image,
            exitCode: state.ExitCode,
            oomKilled: Boolean(state.OOMKilled),
            timedOut,
            outputExceeded,
            time: stats ? stats.cpuTime : started !== undefined && finished !== undefined
                ? Math.max(0, Math.round(finished - started) / 1000)
                : undefined,
            measured: stats !== undefined,
            memory: stats?.memory
        };
    } finally {
        await docker(["rm", "-f", name]).catch(() => { });
    }
}

function sandboxFlags(jobDir: string, mode: "compile" | "run", cpuTime = RUN_CPU_TIME): string[] {
    const memory = mode === "compile" ? COMPILE_MEMORY : `${config.compilerMemLimit}k`;
    const fsize = mode === "compile" ? COMPILE_FSIZE_BYTES : config.compilerFsizeLimit * 1024;

    const flags = [
        // Images are pulled at worker startup; never pull (slowly, into user stderr) mid-job
        "--pull=never",
        "--init",
        "--network=none",
        "--read-only",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--user", "65534",
        "--label", LABEL,
        "--label", `${WORKER_LABEL}=${config.codeRunnerWorkerId}`,
        "--ulimit", "core=0",
        "--ulimit", "nofile=256",
        "--ulimit", `fsize=${fsize}`,
        `--memory=${memory}`,
        `--memory-swap=${memory}`,
        "--cpus=1"
    ];

    if (config.runnerRuntime) {
        flags.push(`--runtime=${config.runnerRuntime}`);
    }

    if (mode === "compile") {
        flags.push(
            "--pids-limit=256",
            // Go copies its warmed build cache into /tmp, so it needs room and exec
            "--tmpfs", "/tmp:size=256m,exec",
            "-v", `${jobDir}:/box`,
            "-w", "/box"
        );
    } else {
        flags.push(
            "--pids-limit=128",
            // Soft limit sends SIGXCPU, hard limit SIGKILL (whole seconds only)
            "--ulimit", `cpu=${cpuTime}:${cpuTime + 1}`,
            "--tmpfs", "/tmp:size=64m",
            "-v", `${jobDir}:/box:ro`,
            "-w", "/tmp"
        );
    }

    return flags;
}

/* ------------------------------------------------------------------ */
/* Job directories                                                      */
/* ------------------------------------------------------------------ */

async function createJobDir() {
    const parent = workerJobsDir();
    fs.mkdirSync(parent, { recursive: true });
    const dir = fs.mkdtempSync(path.join(parent, "job-"));
    // Containers run as uid 65534 and must be able to write compile output here
    fs.chmodSync(dir, 0o777);
    return dir;
}

async function removeDir(dir: string, image: string) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
        // Subdirectories created by uid 65534 (e.g. javac packages) can't be removed by us,
        // so empty them from inside a container running as that uid first
        await docker([
            "run", "--rm", "--network=none", "--user", "65534", "--label", LABEL,
            "-v", `${dir}:/box`, image, "sh", "-c", "rm -rf /box/* /box/.[!.]* 2>/dev/null; true"
        ]).catch(() => { });
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * `timeLimit` is in seconds, `memoryLimit` in KB. Limits are checked against the measured usage too,
 * because the kernel limits are coarser (RLIMIT_CPU counts whole seconds, the container's memory
 * limit includes /tmp and the wrapper).
 */
function describeRunFailure(
    r: ContainerResult,
    timeLimit: number,
    memoryLimit?: number
): { verdict: RunVerdict; message: string } | null {
    if (r.outputExceeded || r.exitCode === EXIT_SIGXFSZ) {
        return { verdict: "outputLimitExceeded", message: "Output limit exceeded" };
    }
    if (r.oomKilled || (memoryLimit !== undefined && r.memory !== undefined && r.memory > memoryLimit)) {
        return { verdict: "memoryLimitExceeded", message: "Memory limit exceeded" };
    }
    // Docker's start-to-finish time includes container start-up, so only the measured time is compared
    const timeExceeded = r.time !== undefined && r.time > (r.measured ? timeLimit : RUN_WALL_TIME);
    if (r.timedOut || r.exitCode === EXIT_SIGXCPU || r.exitCode === EXIT_SIGKILL || timeExceeded) {
        return { verdict: "timeLimitExceeded", message: "Time limit exceeded" };
    }
    if (r.exitCode === EXIT_SIGSEGV) return { verdict: "runtimeError", message: "Segmentation fault (core dumped)" };
    if (r.exitCode > 128) return { verdict: "runtimeError", message: `Program terminated by signal ${r.exitCode - 128}` };
    if (r.exitCode !== 0) return { verdict: "runtimeError", message: `Exited with error status ${r.exitCode}` };
    return null;
}

export async function runInSandbox(
    source: string,
    language: string,
    inputs: (string | Buffer)[],
    limits: RunLimits = {}
): Promise<SandboxResult> {
    const spec = LANGUAGES[language];
    if (!spec) {
        throw new Error("Unsupported language");
    }

    const image = imageFor(language);
    const jobDir = await createJobDir();
    const outputLimit = config.codeOutputLimit;
    // Same cap isolate enforced on its stdout file via --fsize
    const outputKillLimit = config.compilerFsizeLimit * 1024;

    // A time limit means CPU time; a program that sleeps or waits instead is stopped after twice
    // the limit plus a second of wall time
    const timeLimit = limits.timeLimit ? Math.min(limits.timeLimit / 1000, RUN_CPU_TIME) : RUN_CPU_TIME;
    // RLIMIT_CPU counts whole seconds, so a program over a shorter limit runs up to a second;
    // the measured time decides the verdict
    const cpuTime = Math.min(Math.max(Math.ceil(timeLimit), 1), RUN_CPU_TIME);
    const wallTime = limits.timeLimit ? Math.min(timeLimit * 2 + 1, RUN_WALL_TIME) : RUN_WALL_TIME;
    const memoryLimit = limits.memoryLimit ? limits.memoryLimit * 1024 : undefined;

    try {
        fs.writeFileSync(path.join(jobDir, spec.sourceFile), source);

        let compileErr = "";

        if (spec.compiled) {
            const r = await runContainer({
                image,
                command: "compile",
                flags: sandboxFlags(jobDir, "compile"),
                wallTime: COMPILE_WALL_TIME,
                outputLimit,
                outputKillLimit: COMPILE_FSIZE_BYTES
            });

            // clang/javac report errors on stderr, csc on stdout
            compileErr = r.stderr + r.stdout;

            if (r.exitCode !== 0 || r.timedOut) {
                if (r.timedOut) compileErr += "\nCompilation timed out\n";
                else if (r.oomKilled) compileErr += "\nCompiler ran out of memory\n";
                return { compileErr, runResults: [] };
            }
        }

        const runResults: SandboxRunResult[] = [];

        for (const input of inputs) {
            const r = await runContainer({
                image,
                command: "run",
                flags: sandboxFlags(jobDir, "run", cpuTime),
                input,
                wallTime,
                outputLimit,
                // The image section comes on top of the program's own output
                outputKillLimit: outputKillLimit + IMAGE_SECTION_MAX,
                collectImage: true
            });

            const failure = describeRunFailure(r, timeLimit, memoryLimit);
            runResults.push({
                stdout: r.stdout,
                stderr: failure ? r.stderr + failure.message + "\n" : r.stderr,
                // A program we killed has no measurement, and Docker's time would include container start-up
                time: r.timedOut && !r.measured ? undefined : r.time,
                memory: r.memory,
                verdict: failure?.verdict,
                failed: failure !== null,
                ...(r.image ? { image: r.image } : {})
            });

            if (failure) {
                break;
            }
        }

        return { compileErr, runResults };
    } finally {
        await removeDir(jobDir, image).catch(err => {
            console.warn(`Failed to remove job dir ${jobDir}: ${err instanceof Error ? err.message : err}`);
        });
    }
}

/** Removes containers and job dirs left behind by a previous run of this worker. */
export async function cleanupSandboxLeftovers() {
    const ps = await docker(["ps", "-aq", "--filter", `label=${WORKER_LABEL}=${config.codeRunnerWorkerId}`]);
    const ids = ps.stdout.split("\n").map(s => s.trim()).filter(Boolean);
    if (ids.length > 0) {
        await docker(["rm", "-f", ...ids]);
    }

    const parent = workerJobsDir();
    if (fs.existsSync(parent)) {
        const fallbackImage = imageFor(Object.keys(LANGUAGES)[0]);
        for (const entry of fs.readdirSync(parent)) {
            await removeDir(path.join(parent, entry), fallbackImage).catch(() => { });
        }
    }
}

/** Pulls runner images that aren't present locally, so the first job doesn't wait for a download. */
export async function ensureSandboxImages(languages: string[]) {
    const version = await docker(["version", "--format", "{{.Server.Version}}"]).catch(() => null);
    if (!version || version.code !== 0) {
        throw new Error(`Docker is not available: ${version?.stderr.trim() ?? "docker command not found"}`);
    }

    for (const language of languages.filter(isSupportedLanguage)) {
        const image = imageFor(language);
        const inspect = await docker(["image", "inspect", "--format", "{{.Id}}", image]);
        if (inspect.code === 0) continue;

        console.log(`Pulling ${image}...`);
        const pull = await docker(["pull", image]);
        if (pull.code !== 0) {
            throw new Error(`Failed to pull ${image}: ${pull.stderr.trim()}`);
        }
    }
}
