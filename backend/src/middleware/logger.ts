import { format } from "date-fns";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";
import { NextFunction, Request, Response } from "express";
import { config } from "../confg";

const logEvents = async (message: string, logFileName: string) => {
    const dateTime = format(new Date(), 'yyyyMMdd\tHH:mm:ss');
    const logItem = `${dateTime}\t${uuid()}\t${message}\n`;

    console.log(message);

    try {
        if (!fs.existsSync(config.logDir)) {
            await fs.promises.mkdir(config.logDir);
        }
        await fs.promises.appendFile(path.join(config.logDir, logFileName), logItem);
    }
    catch (err) {
        console.log(err);
    }
}

const logger = (req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
}

export {
    logEvents,
    logger
}