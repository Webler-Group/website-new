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
const fileUtils_1 = require("./fileUtils");
const confg_1 = require("../confg");
const exec = (0, util_1.promisify)(child_process_1.exec);
function spawnAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(command, args, options);
        child.on("error", reject);
        child.on("close", (code) => resolve({ code }));
    });
}
async function runInIsolate(source, language, boxId, inputs) {
    const { stdout: initOutput } = await exec(`isolate --box-id=${boxId} --init`);
    const boxDir = initOutput.trim();
    const boxPath = path_1.default.join(boxDir, "box");
    for (let i = 0; i < inputs.length; ++i) {
        const inputPath = path_1.default.join(boxPath, `input${i}`);
        const input = inputs[i];
        if (typeof input === "string") {
            fs_1.default.writeFileSync(inputPath, input, { encoding: "utf-8" });
        }
        else {
            fs_1.default.writeFileSync(inputPath, new Uint8Array(input));
        }
    }
    let sourceFile;
    let execFile;
    let compileCmd = null;
    let runCmd;
    switch (language) {
        case 'c':
            sourceFile = 'main.c';
            execFile = 'main.out';
            compileCmd = `/usr/bin/clang-18 -Wall -o ${execFile} ${sourceFile}`;
            runCmd = `./${execFile}`;
            break;
        case 'cpp':
            sourceFile = 'main.cpp';
            execFile = 'main.out';
            compileCmd = `/usr/bin/clang++-18 -std=c++20 -Wall -o ${execFile} ${sourceFile}`;
            runCmd = `./${execFile}`;
            break;
        case 'python':
            sourceFile = 'main.py';
            runCmd = `/usr/bin/python3 ${sourceFile}`;
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
    fs_1.default.writeFileSync(path_1.default.join(boxPath, sourceFile), source);
    const runResults = [];
    let compileErr = "";
    let compileSuccess = true;
    // Compile step
    if (compileCmd) {
        const compileArgs = [
            `--box-id=${boxId}`,
            "--run",
            "--processes=20",
            `--fsize=${confg_1.config.compilerFsizeLimit}`,
            "--stdout=compile.out",
            "--stderr=compile.err",
            "--",
            ...compileCmd.split(" ")
        ];
        try {
            const compileResult = await spawnAsync("isolate", compileArgs, {
                cwd: boxPath,
                stdio: "inherit"
            });
            if (compileResult.code !== 0) {
                compileSuccess = false;
            }
            const compileErrPath = path_1.default.join(boxPath, "compile.err");
            if (fs_1.default.existsSync(compileErrPath)) {
                compileErr += (0, fileUtils_1.safeReadFile)(compileErrPath, confg_1.config.compilerFsizeLimit);
            }
        }
        catch (err) {
            compileSuccess = false;
            compileErr = err?.message ?? "Something went wrong";
        }
    }
    // Run step
    if (compileSuccess) {
        for (let i = 0; i < inputs.length; ++i) {
            const runArgs = [
                `--box-id=${boxId}`,
                "--run",
                `--stdin=input${i}`,
                "--processes=1",
                `--mem=${confg_1.config.compilerMemLimit}`,
                `--meta=meta${i}`,
                `--fsize=${confg_1.config.compilerFsizeLimit}`,
                "--time=2",
                "--wall-time=3",
                `--stdout=run${i}.out`,
                `--stderr=run${i}.err`,
                "--",
                ...runCmd.split(" ")
            ];
            let runOut = "";
            let runErr = "";
            try {
                await spawnAsync("isolate", runArgs, {
                    cwd: boxPath,
                    stdio: "inherit"
                });
                const runOutPath = path_1.default.join(boxPath, `run${i}.out`);
                const runErrPath = path_1.default.join(boxPath, `run${i}.err`);
                if (fs_1.default.existsSync(runOutPath)) {
                    runOut = (0, fileUtils_1.safeReadFile)(runOutPath, confg_1.config.compilerFsizeLimit);
                }
                if (fs_1.default.existsSync(runErrPath)) {
                    runErr += (0, fileUtils_1.safeReadFile)(runErrPath, confg_1.config.compilerFsizeLimit);
                }
                const metaPath = path_1.default.join(boxPath, `meta${i}`);
                let meta;
                if (fs_1.default.existsSync(metaPath)) {
                    const metaContent = fs_1.default.readFileSync(metaPath, "utf-8");
                    meta = Object.fromEntries(metaContent
                        .split("\n")
                        .filter(line => line.includes(":"))
                        .map(line => line.split(":").map(part => part.trim())));
                    if (meta.status && meta.status !== "OK") {
                        if (meta.status === "SG" && meta.exitsig === "11") {
                            runErr += "\nSegmentation fault (core dumped)";
                        }
                        else if (meta.message) {
                            runErr += `\n${meta.message}`;
                        }
                        else {
                            runErr += `\nProgram terminated with status ${meta.status}`;
                        }
                    }
                }
                const time = Number(meta.time);
                runResults.push({
                    stdout: runOut,
                    stderr: runErr,
                    time: Number.isNaN(time) ? undefined : time
                });
            }
            catch (err) {
                runResults.push({
                    stdout: "",
                    stderr: err?.message ?? "Something went wrong",
                });
            }
        }
    }
    await exec(`isolate --box-id=${boxId} --cleanup`);
    return {
        compileErr,
        runResults
    };
}
exports.runInIsolate = runInIsolate;
