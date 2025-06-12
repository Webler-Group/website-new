"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInIsolate = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fileUtils_1 = require("./fileUtils");
const confg_1 = require("../confg");
function runInIsolate(source, language, boxId, stdin = "") {
    return __awaiter(this, void 0, void 0, function* () {
        const boxDir = (0, child_process_1.execSync)(`isolate --box-id=${boxId} --init`).toString().trim();
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
        // Compile step (if needed)
        if (compileCmd) {
            const compile = (0, child_process_1.spawnSync)("isolate", [
                `--box-id=${boxId}`,
                "--run",
                "--processes=20",
                `--fsize=${confg_1.config.compilerFsizeLimit}`,
                "--stdout=compile.out",
                "--stderr=compile.err",
                "--",
                ...compileCmd.split(" ")
            ], {
                cwd: boxPath,
                encoding: "utf-8"
            });
            if (compile.status !== 0) {
                success = false;
            }
            const compileErrPath = path_1.default.join(boxPath, "compile.err");
            if (fs_1.default.existsSync(compileErrPath)) {
                stderr += (0, fileUtils_1.safeReadFile)(compileErrPath, confg_1.config.compilerFsizeLimit);
            }
        }
        // Run step
        let runResult;
        if (success) {
            runResult = (0, child_process_1.spawnSync)("isolate", [
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
            ], {
                cwd: boxPath,
                encoding: "utf-8"
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
        (0, child_process_1.execSync)(`isolate --box-id=${boxId} --cleanup`);
        return { stdout, stderr };
    });
}
exports.runInIsolate = runInIsolate;
