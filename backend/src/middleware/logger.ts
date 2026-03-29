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
    const query = Object.keys(req.query).length ? JSON.stringify(req.query) : '';
    const body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : '';
    console.log(`${ip}\t${req.method} ${req.path}${query ? '\t' + query : ''}${body ? '\t' + body : ''}`);
    next();
}

export {
    logEvents,
    logger
}