import { spawn, exec as execCallback } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import { safeReadFile } from "./fileUtils";
import { config } from "../confg";

const exec = promisify(execCallback);

interface RunResult {
    stdout: string;
    stderr: string;
    success: boolean;
}

interface SpawnResult {
    code: number | null;
    stdout: string;
    stderr: string;
    killed: boolean;
}

function spawnWithTimeout(
    command: string,
    args: string[],
    options: any,
    timeoutMs: number = 10000
): Promise<SpawnResult> {
    return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let killed = false;

        const child = spawn(command, args, {
            ...options,
            // Use ulimit to set memory limits on Unix-like systems
            shell: true
        });

        // Set timeout for compilation
        const timer = setTimeout(() => {
            killed = true;
            child.kill("SIGKILL");
        }, timeoutMs);

        child.stdout?.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr?.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("error", (err) => {
            clearTimeout(timer);
            resolve({
                code: 1,
                stdout,
                stderr: stderr + "\n" + err.message,
                killed
            });
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({ code, stdout, stderr, killed });
        });
    });
}

async function compileOutsideIsolate(
    source: string,
    language: string,
    tempDir: string
): Promise<{ success: boolean; stderr: string; execFile?: string }> {
    let sourceFile: string;
    let execFile: string;
    let compileCmd: string;
    let compileArgs: string[];

    switch (language) {
        case 'c':
            sourceFile = path.join(tempDir, 'main.c');
            execFile = path.join(tempDir, 'main.out');
            compileCmd = '/usr/bin/clang-20';
            compileArgs = ["-Wall", "-Wextra", "-o", execFile, sourceFile];
            break;
        case 'cpp':
            sourceFile = path.join(tempDir, 'main.cpp');
            execFile = path.join(tempDir, 'main.out');
            compileCmd = '/usr/bin/clang++-20';
            compileArgs = ["-std=c++20", "-Wall", "-Wextra", "-o", execFile, sourceFile];
            break;
        default:
            // No compilation needed for interpreted languages
            return { success: true, stderr: "" };
    }

    // Write source file
    fs.writeFileSync(sourceFile, source);

    // Apply resource limits using ulimit and timeout
    const memLimitKB = Math.floor(config.compilerMemLimit / 1024);
    const ulimitPrefix = `ulimit -v ${memLimitKB} -t 5 && `;

    // Compile with timeout and resource limits
    const compileResult = await spawnWithTimeout(
        '/bin/bash',
        ['-c', `${ulimitPrefix}${compileCmd} ${compileArgs.join(' ')}`],
        {
            cwd: tempDir,
            env: { ...process.env, TMPDIR: tempDir }
        },
        5000 // 5 second timeout for compilation
    );

    if (compileResult.killed) {
        return {
            success: false,
            stderr: "Compilation timeout: Process exceeded time limit (5 seconds)"
        };
    }

    if (compileResult.code !== 0) {
        return {
            success: false,
            stderr: compileResult.stderr || "Compilation failed"
        };
    }

    if (!fs.existsSync(execFile)) {
        return {
            success: false,
            stderr: "Compilation failed: executable not created"
        };
    }

    return {
        success: true,
        stderr: "",
        execFile: path.basename(execFile)
    };
}

async function runInIsolate(
    source: string,
    language: string,
    boxId: number,
    stdin: string = ""
): Promise<RunResult> {
    let tempDir: string | null = null;
    let boxDir: string | null = null;
    let stdout = "";
    let stderr = "";
    let success = true;

    try {
        // Create temporary directory for compilation
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compile-'));

        // Initialize isolate box
        const { stdout: initOutput } = await exec(`isolate --box-id=${boxId} --init`);
        boxDir = initOutput.trim();
        const boxPath = path.join(boxDir, "box");

        // Write stdin
        fs.writeFileSync(path.join(boxPath, "input.txt"), stdin);

        let runCmd: string;
        let sourceFile: string;
        let needsCompilation = false;
        let className: string = "";

        // Determine execution command and whether compilation is needed
        switch (language) {
            case 'c':
            case 'cpp':
                needsCompilation = true;
                runCmd = './main.out';
                break;
            case 'python':
                sourceFile = 'main.py';
                runCmd = `/usr/bin/python3 ${sourceFile}`;
                break;
            case 'nodejs':
                sourceFile = 'main.js';
                runCmd = `/usr/bin/node ${sourceFile}`;
                break;
            case 'ruby':
                sourceFile = 'main.rb';
                runCmd = `/usr/bin/ruby ${sourceFile}`;
                break;
            case 'lua':
                sourceFile = 'main.lua';
                runCmd = `/usr/bin/lua5.4 ${sourceFile}`;
                break;
            default:
                throw new Error('Unsupported language');
        }

        // Handle compilation if needed
        if (needsCompilation) {
            const compileResult = await compileOutsideIsolate(source, language, tempDir);

            if (!compileResult.success) {
                success = false;
                stderr = compileResult.stderr;
            } else if (compileResult.execFile) {
                const execPath = path.join(tempDir, compileResult.execFile);
                const destPath = path.join(boxPath, compileResult.execFile);
                fs.copyFileSync(execPath, destPath);
                // Make executable
                fs.chmodSync(destPath, 0o755);
            }
        } else {
            // For interpreted languages, write source directly to box
            fs.writeFileSync(path.join(boxPath, sourceFile!), source);
        }

        // Run the program inside isolate
        if (success) {
            const runArgs = [
                `--box-id=${boxId}`,
                "--run",
                "--stdin=input.txt",
                "--processes=1",
                `--mem=${config.compilerMemLimit}`,
                "--meta=meta",
                `--fsize=${config.compilerFsizeLimit}`,
                "--time=2",
                "--wall-time=3",
                "--stdout=run.out",
                "--stderr=run.err",
                "--",
                ...runCmd.split(" ")
            ];

            await spawnWithTimeout("isolate", runArgs, {
                cwd: boxPath,
                stdio: "inherit"
            }, 4000); // 4 second timeout for execution

            // Read output files
            const runOutPath = path.join(boxPath, "run.out");
            const runErrPath = path.join(boxPath, "run.err");

            if (fs.existsSync(runOutPath)) {
                stdout = safeReadFile(runOutPath, config.compilerFsizeLimit);
            }

            if (fs.existsSync(runErrPath)) {
                const runErr = safeReadFile(runErrPath, config.compilerFsizeLimit);
                stderr = stderr ? `${stderr}\n${runErr}` : runErr;
            }

            // Check metadata for execution status
            const metaPath = path.join(boxPath, "meta");
            if (fs.existsSync(metaPath)) {
                const metaContent = fs.readFileSync(metaPath, "utf-8");
                const meta = Object.fromEntries(
                    metaContent
                        .split("\n")
                        .filter(line => line.includes(":"))
                        .map(line => {
                            const [key, ...valueParts] = line.split(":");
                            return [key.trim(), valueParts.join(":").trim()];
                        })
                );

                if (meta["status"] && meta["status"] !== "OK") {
                    success = false;

                    if (meta["status"] === "SG" && meta["exitsig"] === "11") {
                        stderr += "\nSegmentation fault (core dumped)";
                    } else if (meta["status"] === "TO") {
                        stderr += "\nTime limit exceeded";
                    } else if (meta["status"] === "RE") {
                        stderr += "\nRuntime error";
                    } else if (meta["message"]) {
                        stderr += `\n${meta["message"]}`;
                    } else {
                        stderr += `\nProgram terminated with status ${meta["status"]}`;
                    }
                }
            }
        }

    } catch (error) {
        success = false;
        stderr += `\nInternal error: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
        // Cleanup resources
        try {
            // Clean up isolate box
            if (boxDir) {
                await exec(`isolate --box-id=${boxId} --cleanup`).catch(() => {
                    // Ignore cleanup errors
                });
            }

            // Clean up temporary compilation directory
            if (tempDir && fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            // Log cleanup errors but don't throw
            console.error("Cleanup error:", cleanupError);
        }
    }

    return { stdout, stderr, success };
}

// Export with backward compatibility
export { runInIsolate };
export type { RunResult };