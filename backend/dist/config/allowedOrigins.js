"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const allowedOrigins = fs_1.default.readFileSync(path_1.default.join(__dirname, "..", "..", ".allowed-origins"), { encoding: "utf-8" })
    .split("\n")
    .map(line => line.trim());
exports.default = allowedOrigins;
