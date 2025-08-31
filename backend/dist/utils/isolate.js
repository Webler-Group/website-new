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
async function runInIsolate(source, language, boxId, stdin = "") {
    const { stdout: initOutput } = await exec(`isolate --box-id=${boxId} --init`);
    const boxDir = initOutput.trim();
    const boxPath = path_1.default.join(boxDir, "box");
    fs_1.default.writeFileSync(path_1.default.join(boxPath, "input.txt"), stdin);
    let sourceFile;
    let execFile;
    let compileCmd = null;
    let runCmd;
    switch (language) {
        case 'c':
            sourceFile = 'main.c';
            execFile = 'main.out';
            compileCmd = `/usr/bin/clang -o ${execFile} ${sourceFile}`;
            runCmd = `./${execFile}`;
            break;
        case 'cpp':
            sourceFile = 'main.cpp';
            execFile = 'main.out';
            compileCmd = `/usr/bin/clang++ -o ${execFile} ${sourceFile}`;
            runCmd = `./${execFile}`;
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
    fs_1.default.writeFileSync(path_1.default.join(boxPath, sourceFile), source);
    let stdout = "";
    let stderr = "";
    let success = true;
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
        const compileResult = await spawnAsync("isolate", compileArgs, {
            cwd: boxPath,
            stdio: "inherit"
        });
        if (compileResult.code !== 0) {
            success = false;
        }
        const compileErrPath = path_1.default.join(boxPath, "compile.err");
        if (fs_1.default.existsSync(compileErrPath)) {
            stderr += (0, fileUtils_1.safeReadFile)(compileErrPath, confg_1.config.compilerFsizeLimit);
        }
    }
    // Run step
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
        await spawnAsync("isolate", runArgs, {
            cwd: boxPath,
            stdio: "inherit"
        });
        const runOutPath = path_1.default.join(boxPath, "run.out");
        const runErrPath = path_1.default.join(boxPath, "run.err");
        if (fs_1.default.existsSync(runOutPath)) {
            stdout = (0, fileUtils_1.safeReadFile)(runOutPath, confg_1.config.compilerFsizeLimit);
        }
        if (fs_1.default.existsSync(runErrPath)) {
            stderr += (0, fileUtils_1.safeReadFile)(runErrPath, confg_1.config.compilerFsizeLimit);
        }
        const metaPath = path_1.default.join(boxPath, "meta");
        if (fs_1.default.existsSync(metaPath)) {
            const metaContent = fs_1.default.readFileSync(metaPath, "utf-8");
            const meta = Object.fromEntries(metaContent
                .split("\n")
                .filter(line => line.includes(":"))
                .map(line => line.split(":").map(part => part.trim())));
            if (meta["status"] && meta["status"] !== "OK") {
                success = false;
                if (meta["status"] === "SG" && meta["exitsig"] === "11") {
                    stderr += "\nSegmentation fault (core dumped)";
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
    await exec(`isolate --box-id=${boxId} --cleanup`);
    return { stdout, stderr };
}
exports.runInIsolate = runInIsolate;
