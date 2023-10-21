import rateLimit from "express-rate-limit";
import { logEvents } from "./logger";

const requestLimiter = (windowS: number, max: number, message: string) => rateLimit({
    windowMs: windowS * 1000, // 1 minute
    max, // Limit each IP to 5 login requests per `window` per minute
    message:
        { message },
    handler: (req, res, next, options) => {
        logEvents(`Too Many Requests: ${options.message.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log')
        res.status(options.statusCode).send(options.message)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export default requestLimiter;