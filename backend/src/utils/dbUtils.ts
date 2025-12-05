import { exec } from "child_process";
import { URL } from "url";
import path from "path";
import { config } from "../confg";

function dump(dumpDir: string) {
    const uri = config.databaseUri;
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace("/", "");
    const authDb = parsed.searchParams.get("authSource") || "admin";
    const now = new Date();
    const timestamp = now
        .toISOString()
        .slice(0, 16) // get "YYYY-MM-DDTHH:MM"
        .replace('T', '_') // make it file-safe
        .replace(/:/g, '-'); // replace colons
    const dumpPath = path.join(dumpDir, `website-new-dump-${timestamp}`);


    const parts = [
        "mongodump",
        `--host=${parsed.hostname}`,
        `--port=${parsed.port || 27017}`,
        `--db=${dbName}`,
        `--out=${dumpPath}`
    ];

    if (parsed.username && parsed.password) {
        parts.push(`--username=${parsed.username}`);
        parts.push(`--password=${parsed.password}`);
        parts.push(`--authenticationDatabase=${authDb}`);
    }

    const command = parts.join(" ");

    console.log("📦 Running mongodump...\n", command);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error("Error running mongodump:", error.message);
            return;
        }
        if (stderr) {
            console.warn("Mongodump stderr:", stderr);
        }
        console.log("Database export complete:\n", stdout);
    });
}

function restore(dumpPath: string) {

    const uri = config.databaseUri;
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace("/", "");
    const authDb = parsed.searchParams.get("authSource") || "admin";

    const parts = [
        "mongorestore",
        `--host=${parsed.hostname}`,
        `--port=${parsed.port || 27017}`,
        `--db=${dbName}`,
        `--drop`, // Drop existing collections before restore
        dumpPath
    ];

    if (parsed.username && parsed.password) {
        parts.push(`--username=${parsed.username}`);
        parts.push(`--password=${parsed.password}`);
        parts.push(`--authenticationDatabase=${authDb}`);
    }

    const command = parts.join(" ");

    console.log("Running mongorestore...\n", command);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error("Error running mongorestore:", error.message);
            return;
        }
        if (stderr) {
            console.warn("mongorestore stderr:", stderr);
        }
        console.log("Database restore complete:\n", stdout);
    });

}

export {
    dump,
    restore
}