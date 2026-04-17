import { format } from "date-fns";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { NextFunction, Request, Response } from "express";
import { config } from "../confg";
import { getRequestIp } from "../helpers/userHelper";

const logEvents = async (message: string, logFileName: string) => {
    const dateTime = format(new Date(), 'yyyyMMdd\tHH:mm:ss');
    const logItem = `${dateTime}\t${crypto.randomUUID()}\t${message}\n`;

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
    const ip = getRequestIp(req);
    const referer = req.headers['referer'] || '';
    console.log(`${ip}\t${req.method} ${req.path}\t${referer}`);
    next();
}

export {
    logEvents,
    logger
}