import { execSync, spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import { safeReadFile } from "./fileUtils";
import { config } from "../confg";

async function runInIsolate(source: string, language: string, boxId: number, stdin: string = ""): Promise<{ stdout: string; stderr: string }> {
    const boxDir = execSync(`isolate --box-id=${boxId} --init`).toString().trim();
    const boxPath = path.join(boxDir, "box");

    fs.writeFileSync(path.join(boxPath, "input.txt"), stdin);

    let sourceFile: string;
    let execFile: string;
    let compileCmd: string | null = null;
    let runCmd: string;

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

    fs.writeFileSync(path.join(boxPath, sourceFile), source);

    let stdout = "";
    let stderr = "";
    let success = true;

    // Compile step (if needed)
    if (compileCmd) {
        const compile = spawnSync("isolate", [
            `--box-id=${boxId}`,
            "--run",
            "--processes=20",
            `--fsize=${config.compilerFsizeLimit}`,
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

        const compileErrPath = path.join(boxPath, "compile.err");
        if (fs.existsSync(compileErrPath)) {
            stderr += safeReadFile(compileErrPath, config.compilerFsizeLimit);
        }
    }

    // Run step
    let runResult;
    if (success) {

        runResult = spawnSync("isolate", [
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
        ], {
            cwd: boxPath,
            encoding: "utf-8"
        });

        const runOutPath = path.join(boxPath, "run.out");
        const runErrPath = path.join(boxPath, "run.err");

        if (fs.existsSync(runOutPath)) {
            stdout = safeReadFile(runOutPath, config.compilerFsizeLimit);
        }

        if (fs.existsSync(runErrPath)) {
            stderr += safeReadFile(runErrPath, config.compilerFsizeLimit);
        }

        const metaPath = path.join(boxPath, "meta");
        if (fs.existsSync(metaPath)) {
            const metaContent = fs.readFileSync(metaPath, "utf-8");

            const meta = Object.fromEntries(
                metaContent
                    .split("\n")
                    .filter(line => line.includes(":"))
                    .map(line => line.split(":").map(part => part.trim()))
            );

            if (meta["status"] && meta["status"] !== "OK") {
                success = false;

                if (meta["status"] === "SG" && meta["exitsig"] === "11") {
                    stderr += "\nSegmentation fault (core dumped)";
                } else if (meta["message"]) {
                    stderr += `\n${meta["message"]}`;
                } else {
                    stderr += `\nProgram terminated with status ${meta["status"]}`;
                }
            }
        }

    }

    execSync(`isolate --box-id=${boxId} --cleanup`);

    return { stdout, stderr };
}

export { runInIsolate };
