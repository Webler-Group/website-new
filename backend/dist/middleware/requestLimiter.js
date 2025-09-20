"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("./logger");
const requestLimiter = (windowS, max, message) => (0, express_rate_limit_1.default)({
    windowMs: windowS * 1000,
    max,
    message: { message },
    handler: (req, res, next, options) => {
        (0, logger_1.logEvents)(`Too Many Requests: ${options.message.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log');
        // if (config.nodeEnv == "development") {
        //     return next();
        // }
        res.status(options.statusCode).send({ error: [options.message] });
    },
    standardHeaders: true,
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
exports.default = requestLimiter;
