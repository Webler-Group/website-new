"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dbUtils_1 = require("../utils/dbUtils");
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error("Usage: node restore.js <dump_path>");
    process.exit(1);
}
const dumpPath = path_1.default.resolve(args[0]);
(0, dbUtils_1.restore)(dumpPath);
