"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
const confg_1 = require("../confg");
const uri = confg_1.config.databaseUri;
const parsed = new url_1.URL(uri);
const dbName = parsed.pathname.replace("/", "");
const authDb = parsed.searchParams.get("authSource") || "admin";
const now = new Date();
const timestamp = now
    .toISOString()
    .slice(0, 16) // get "YYYY-MM-DDTHH:MM"
    .replace('T', '_') // make it file-safe
    .replace(/:/g, '-'); // replace colons
const dumpDir = path_1.default.resolve(`website-new-dump-${timestamp}`);
const parts = [
    "mongodump",
    `--host=${parsed.hostname}`,
    `--port=${parsed.port || 27017}`,
    `--db=${dbName}`,
    `--out=${dumpDir}`
];
if (parsed.username && parsed.password) {
    parts.push(`--username=${parsed.username}`);
    parts.push(`--password=${parsed.password}`);
    parts.push(`--authenticationDatabase=${authDb}`);
}
const command = parts.join(" ");
console.log("📦 Running mongodump...\n", command);
(0, child_process_1.exec)(command, (error, stdout, stderr) => {
    if (error) {
        console.error("Error running mongodump:", error.message);
        return;
    }
    if (stderr) {
        console.warn("Mongodump stderr:", stderr);
    }
    console.log("Database export complete:\n", stdout);
});
