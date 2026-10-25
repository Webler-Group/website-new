import { exec } from "child_process";
import { URL } from "url";
import path from "path";
import { config } from "../confg";
import { spawn } from "child_process";

function dump(dumpDir: string): Promise<string> {
    const parsed = new URL(config.databaseUri);
    const dbName = parsed.pathname.replace("/", "");
    const authDb = parsed.searchParams.get("authSource") || "admin";
    const timestamp = new Date()
        .toISOString()
        .slice(0, 16)
        .replace("T", "_")
        .replace(/:/g, "-");
    const dumpPath = path.join(dumpDir, `website-new-dump-${timestamp}`);

    const args = [
        `--host=${parsed.hostname}`,
        `--port=${parsed.port || 27017}`,
        `--db=${dbName}`,
        `--out=${dumpPath}`,
        "--gzip",
        "--quiet",
    ];

    if (parsed.username && parsed.password) {
        args.push(
            `--username=${decodeURIComponent(parsed.username)}`,
            `--password=${decodeURIComponent(parsed.password)}`,
            `--authenticationDatabase=${authDb}`
        );
    }

    console.log(`Running mongodump -> ${dumpPath}`); // no credentials in logs

    return new Promise((resolve, reject) => {
        const child = spawn("mongodump", args, { stdio: ["ignore", "ignore", "pipe"] });

        let stderrTail = "";
        child.stderr.on("data", (d) => {
            stderrTail = (stderrTail + d.toString()).slice(-4000); // keep only the tail
        });

        // kill a hung dump after 2 hours
        const timer = setTimeout(() => child.kill("SIGTERM"), 2 * 60 * 60 * 1000);

        child.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            if (code === 0) {
                console.log("Database export complete");
                resolve(dumpPath);
            } else {
                reject(new Error(`mongodump exited with code ${code}: ${stderrTail}`));
            }
        });
    });
}

function restore(dumpPath: string): Promise<void> {
    const parsed = new URL(config.databaseUri);
    const dbName = parsed.pathname.replace("/", "");
    const authDb = parsed.searchParams.get("authSource") || "admin";

    const args = [
        `--host=${parsed.hostname}`,
        `--port=${parsed.port || 27017}`,
        `--nsInclude=${dbName}.*`,
        "--drop",
        "--gzip",
        "--quiet",
        dumpPath,
    ];

    if (parsed.username && parsed.password) {
        args.push(
            `--username=${decodeURIComponent(parsed.username)}`,
            `--password=${decodeURIComponent(parsed.password)}`,
            `--authenticationDatabase=${authDb}`
        );
    }

    console.log(`Running mongorestore <- ${dumpPath}`); // no credentials in logs

    return new Promise((resolve, reject) => {
        const child = spawn("mongorestore", args, { stdio: ["ignore", "ignore", "pipe"] });

        let stderrTail = "";
        child.stderr.on("data", (d) => {
            stderrTail = (stderrTail + d.toString()).slice(-4000);
        });

        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                console.log("Database restore complete");
                resolve();
            } else {
                reject(new Error(`mongorestore exited with code ${code}: ${stderrTail}`));
            }
        });
    });
}

export {
    dump,
    restore
}