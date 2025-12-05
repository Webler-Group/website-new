"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dbUtils_1 = require("../utils/dbUtils");
const path_1 = __importDefault(require("path"));
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error("Usage: node dump.js <dump_dir>");
    process.exit(1);
}
const dumpDir = path_1.default.resolve(args[0]);
(0, dbUtils_1.dump)(dumpDir);
