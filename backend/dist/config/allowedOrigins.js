"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const allowedOrigins = process.env.NODE_ENV === "production" ?
    [
        "http://localhost:5500",
        "https://api-webler.onrender.com",
        "https://webler.onrender.com",
        ""
    ] :
    [
        "https://api-webler.onrender.com",
        "https://webler.onrender.com",
    ];
exports.default = allowedOrigins;
