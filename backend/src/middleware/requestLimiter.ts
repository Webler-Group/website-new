import rateLimit from "express-rate-limit";
import { logEvents } from "./logger";
import { config } from "../confg";

const requestLimiter = (windowS: number, max: number, message: string) => rateLimit({
    windowMs: windowS * 1000,
    max,
    message: { message },
    handler: (req, res, next, options) => {
        logEvents(`Too Many Requests: ${options.message.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log')
        // if (config.nodeEnv == "development") {
        //     return next();
        // }
        res.status(options.statusCode).send({ error: [options.message] });
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export default requestLimiter;