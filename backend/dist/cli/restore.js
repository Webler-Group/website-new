"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
const confg_1 = require("../confg");
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error("Usage: node restore.js <dump_path>");
    process.exit(1);
}
const dumpPath = path_1.default.resolve(args[0]);
const uri = confg_1.config.databaseUri;
const parsed = new url_1.URL(uri);
const dbName = parsed.pathname.replace("/", "");
const authDb = parsed.searchParams.get("authSource") || "admin";
const parts = [
    "mongorestore",
    `--host=${parsed.hostname}`,
    `--port=${parsed.port || 27017}`,
    `--db=${dbName}`,
    `--drop`,
    dumpPath
];
if (parsed.username && parsed.password) {
    parts.push(`--username=${parsed.username}`);
    parts.push(`--password=${parsed.password}`);
    parts.push(`--authenticationDatabase=${authDb}`);
}
const command = parts.join(" ");
console.log("Running mongorestore...\n", command);
(0, child_process_1.exec)(command, (error, stdout, stderr) => {
    if (error) {
        console.error("Error running mongorestore:", error.message);
        return;
    }
    if (stderr) {
        console.warn("mongorestore stderr:", stderr);
    }
    console.log("Database restore complete:\n", stdout);
});
