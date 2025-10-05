"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInIsolate = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const fileUtils_1 = require("./fileUtils");
const confg_1 = require("../confg");
const exec = (0, util_1.promisify)(child_process_1.exec);
function spawnWithTimeout(command, args, options, timeoutMs = 10000) {
    return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let killed = false;
        const child = (0, child_process_1.spawn)(command, args, {
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
async function compileOutsideIsolate(source, language, tempDir) {
    let sourceFile;
    let execFile;
    let compileCmd;
    let compileArgs;
    switch (language) {
        case 'c':
            sourceFile = path_1.default.join(tempDir, 'main.c');
            execFile = path_1.default.join(tempDir, 'main.out');
            compileCmd = '/usr/bin/clang-20';
            compileArgs = ['-o', execFile, sourceFile];
            break;
        case 'cpp':
            sourceFile = path_1.default.join(tempDir, 'main.cpp');
            execFile = path_1.default.join(tempDir, 'main.out');
            compileCmd = '/usr/bin/clang++-20';
            compileArgs = ['-o', execFile, sourceFile];
            break;
        default:
            // No compilation needed for interpreted languages
            return { success: true, stderr: "" };
    }
    // Write source file
    fs_1.default.writeFileSync(sourceFile, source);
    // Apply resource limits using ulimit and timeout
    const memLimitKB = Math.floor(confg_1.config.compilerMemLimit / 1024);
    const ulimitPrefix = `ulimit -v ${memLimitKB} -t 5 && `;
    // Compile with timeout and resource limits
    const compileResult = await spawnWithTimeout('/bin/bash', ['-c', `${ulimitPrefix}${compileCmd} ${compileArgs.join(' ')}`], {
        cwd: tempDir,
        env: { ...process.env, TMPDIR: tempDir }
    }, 5000 // 5 second timeout for compilation
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
    if (!fs_1.default.existsSync(execFile)) {
        return {
            success: false,
            stderr: "Compilation failed: executable not created"
        };
    }
    return {
        success: true,
        stderr: "",
        execFile: path_1.default.basename(execFile)
    };
}
async function runInIsolate(source, language, boxId, stdin = "") {
    let tempDir = null;
    let boxDir = null;
    let stdout = "";
    let stderr = "";
    let success = true;
    try {
        // Create temporary directory for compilation
        tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'compile-'));
        // Initialize isolate box
        const { stdout: initOutput } = await exec(`isolate --box-id=${boxId} --init`);
        boxDir = initOutput.trim();
        const boxPath = path_1.default.join(boxDir, "box");
        // Write stdin
        fs_1.default.writeFileSync(path_1.default.join(boxPath, "input.txt"), stdin);
        let runCmd;
        let sourceFile;
        let needsCompilation = false;
        let className = "";
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
            }
            else if (compileResult.execFile) {
                const execPath = path_1.default.join(tempDir, compileResult.execFile);
                const destPath = path_1.default.join(boxPath, compileResult.execFile);
                fs_1.default.copyFileSync(execPath, destPath);
                // Make executable
                fs_1.default.chmodSync(destPath, 0o755);
            }
        }
        else {
            // For interpreted languages, write source directly to box
            fs_1.default.writeFileSync(path_1.default.join(boxPath, sourceFile), source);
        }
        // Run the program inside isolate
        if (success) {
            const runArgs = [
                `--box-id=${boxId}`,
                "--run",
                "--stdin=input.txt",
                "--processes=1",
                `--mem=${confg_1.config.compilerMemLimit}`,
                "--meta=meta",
                `--fsize=${confg_1.config.compilerFsizeLimit}`,
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
            const runOutPath = path_1.default.join(boxPath, "run.out");
            const runErrPath = path_1.default.join(boxPath, "run.err");
            if (fs_1.default.existsSync(runOutPath)) {
                stdout = (0, fileUtils_1.safeReadFile)(runOutPath, confg_1.config.compilerFsizeLimit);
            }
            if (fs_1.default.existsSync(runErrPath)) {
                const runErr = (0, fileUtils_1.safeReadFile)(runErrPath, confg_1.config.compilerFsizeLimit);
                stderr = stderr ? `${stderr}\n${runErr}` : runErr;
            }
            // Check metadata for execution status
            const metaPath = path_1.default.join(boxPath, "meta");
            if (fs_1.default.existsSync(metaPath)) {
                const metaContent = fs_1.default.readFileSync(metaPath, "utf-8");
                const meta = Object.fromEntries(metaContent
                    .split("\n")
                    .filter(line => line.includes(":"))
                    .map(line => {
                    const [key, ...valueParts] = line.split(":");
                    return [key.trim(), valueParts.join(":").trim()];
                }));
                if (meta["status"] && meta["status"] !== "OK") {
                    success = false;
                    if (meta["status"] === "SG" && meta["exitsig"] === "11") {
                        stderr += "\nSegmentation fault (core dumped)";
                    }
                    else if (meta["status"] === "TO") {
                        stderr += "\nTime limit exceeded";
                    }
                    else if (meta["status"] === "RE") {
                        stderr += "\nRuntime error";
                    }
                    else if (meta["message"]) {
                        stderr += `\n${meta["message"]}`;
                    }
                    else {
                        stderr += `\nProgram terminated with status ${meta["status"]}`;
                    }
                }
            }
        }
    }
    catch (error) {
        success = false;
        stderr += `\nInternal error: ${error instanceof Error ? error.message : String(error)}`;
    }
    finally {
        // Cleanup resources
        try {
            // Clean up isolate box
            if (boxDir) {
                await exec(`isolate --box-id=${boxId} --cleanup`).catch(() => {
                    // Ignore cleanup errors
                });
            }
            // Clean up temporary compilation directory
            if (tempDir && fs_1.default.existsSync(tempDir)) {
                fs_1.default.rmSync(tempDir, { recursive: true, force: true });
            }
        }
        catch (cleanupError) {
            // Log cleanup errors but don't throw
            console.error("Cleanup error:", cleanupError);
        }
    }
    return { stdout, stderr, success };
}
exports.runInIsolate = runInIsolate;
