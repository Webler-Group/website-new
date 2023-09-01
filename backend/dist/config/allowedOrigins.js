"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const allowedOrigins = process.env.NODE_ENV === "production" ?
    [
        "https://chillpillcoding.com"
    ] :
    [
        "http://localhost:5500",
        "http://localhost:5173",
        ""
    ];
exports.default = allowedOrigins;
