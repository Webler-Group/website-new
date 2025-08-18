"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const confg_1 = require("../confg");
const corsOptions = {
    origin: (origin, callback) => {
        origin = origin ? origin : "";
        if (confg_1.config.allowedOrigins.includes(origin)) {
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
