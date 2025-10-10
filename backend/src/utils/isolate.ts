import { spawn, exec as execCallback } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { safeReadFile } from "./fileUtils";
import { config } from "../confg";

const exec = promisify(execCallback);

function spawnAsync(command: string, args: string[], options: any): Promise<{ code: number | null }> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, options);
        child.on("error", reject);
        child.on("close", (code) => resolve({ code }));
    });
}

async function runInIsolate(source: string, language: string, boxId: number, inputs: (string | Buffer)[]) {
    const { stdout: initOutput } = await exec(`isolate --box-id=${boxId} --init`);
    const boxDir = initOutput.trim();
    const boxPath = path.join(boxDir, "box");

    for (let i = 0; i < inputs.length; ++i) {
        const inputPath = path.join(boxPath, `input${i}`);
        const input = inputs[i];

        if (typeof input === "string") {
            fs.writeFileSync(inputPath, input, { encoding: "utf-8" });
        } else {
            fs.writeFileSync(inputPath, new Uint8Array(input));
        }
    }

    let sourceFile: string;
    let execFile: string;
    let compileCmd: string | null = null;
    let runCmd: string;

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

    fs.writeFileSync(path.join(boxPath, sourceFile), source);

    const runResults = [];
    let compileErr = "";
    let compileSuccess = true;

    // Compile step
    if (compileCmd) {
        const compileArgs = [
            `--box-id=${boxId}`,
            "--run",
            "--processes=20",
            `--fsize=${config.compilerFsizeLimit}`,
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

            const compileErrPath = path.join(boxPath, "compile.err");
            if (fs.existsSync(compileErrPath)) {
                compileErr += safeReadFile(compileErrPath, config.compilerFsizeLimit);
            }
        } catch (err: any) {
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
                `--mem=${config.compilerMemLimit}`,
                `--meta=meta${i}`,
                `--fsize=${config.compilerFsizeLimit}`,
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

                const runOutPath = path.join(boxPath, `run${i}.out`);
                const runErrPath = path.join(boxPath, `run${i}.err`);

                if (fs.existsSync(runOutPath)) {
                    runOut = safeReadFile(runOutPath, config.compilerFsizeLimit);
                }

                if (fs.existsSync(runErrPath)) {
                    runErr += safeReadFile(runErrPath, config.compilerFsizeLimit);
                }

                const metaPath = path.join(boxPath, `meta${i}`);
                let meta: any;
                if (fs.existsSync(metaPath)) {
                    const metaContent = fs.readFileSync(metaPath, "utf-8");
                    meta = Object.fromEntries(
                        metaContent
                            .split("\n")
                            .filter(line => line.includes(":"))
                            .map(line => line.split(":").map(part => part.trim()))
                    );

                    if (meta.status && meta.status !== "OK") {

                        if (meta.status === "SG" && meta.exitsig === "11") {
                            runErr += "\nSegmentation fault (core dumped)";
                        } else if (meta.message) {
                            runErr += `\n${meta.message}`;
                        } else {
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
            } catch (err: any) {
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

export { runInIsolate };