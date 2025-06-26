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
const corsOptions = {
    origin: (origin, callback) => {
        origin = origin ? origin : "";
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: "*"
};
exports.default = corsOptions;
