import { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logEvents } from "./logger";
import { config } from "../confg";
import { getRequestIp } from "../helpers/userHelper";
import { IAuthRequest } from "./verifyJWT";

// Behind nginx/Cloudflare req.ip is always the proxy, so every user would share one bucket.
// Logged-in users are limited per account (so classmates on one school IP don't block each other),
// anonymous requests per real client IP (IPv6 grouped by /56 subnet).
const limiterKey = (req: Request) => {
    const userId = (req as IAuthRequest).userId;
    if (userId) {
        return `user:${userId}`;
    }
    return `ip:${ipKeyGenerator(getRequestIp(req) ?? "unknown")}`;
};

const requestLimiter = (windowS: number, max: number, message: string) => rateLimit({
    windowMs: windowS * 1000,
    max,
    message: { message },
    keyGenerator: limiterKey,
    // We read the client IP from proxy headers ourselves in limiterKey
    validate: { xForwardedForHeader: false, trustProxy: false },
    handler: (req, res, next, options) => {
        logEvents(`Too Many Requests: ${options.message.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log')
        if (config.nodeEnv == "development") {
            return next();
        }
        res.status(options.statusCode).send({ error: [options.message] });
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export default requestLimiter;