import { exec } from "child_process";
import { URL } from "url";
import path from "path";
import { config } from "../confg";

const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error("Usage: node restore.js <dump_path>");
  process.exit(1);
}

const dumpPath = path.resolve(args[0]);

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
