import { format } from "date-fns";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";
import { NextFunction, Request, Response } from "express";

const logEvents = async (message: string, logFileName: string) => {
    if (process.env.NODE_ENV !== "development") {
        return;
    }
    const dateTime = format(new Date(), 'yyyyMMdd\tHH:mm:ss');
    const logItem = `${dateTime}\t${uuid()}\t${message}\n`;

    try {
        if (!fs.existsSync(path.join(__dirname, "..", "..", "logs"))) {
            await fs.promises.mkdir(path.join(__dirname, "..", "..", "logs"));
        }
        await fs.promises.appendFile(path.join(__dirname, "..", "..", "logs", logFileName), logItem);
    }
    catch (err) {
        console.log(err);
    }
}

const logger = (req: Request, res: Response, next: NextFunction) => {
    logEvents(`${req.method}\t${req.url}\t${req.headers.origin}`, 'reqLog.log');
    console.log(`${req.method} ${req.path}`);
    next();
}

export {
    logEvents,
    logger
}