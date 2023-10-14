"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
