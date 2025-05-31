"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const allowedOrigins_1 = __importDefault(require("./allowedOrigins"));
const corsOptions = {
    origin: (origin, callback) => {
        origin = origin ? origin : "";
        if (allowedOrigins_1.default.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS\nOrigin: ' + origin + '\nAllowed origins: ' + allowedOrigins_1.default.join(", ")));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
exports.default = corsOptions;
