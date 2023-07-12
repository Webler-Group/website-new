import { Request, Response, NextFunction } from "express";
import { logEvents } from "./logger";
import { CastError } from "mongoose";

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logEvents(`${err.name}: ${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log');
    console.log(err.stack);

    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    if(err.name === 'CastError' && (err as CastError).kind === 'ObjectId') {
        statusCode = 404;
        message = 'Resource not found';
    }

    res
        .status(statusCode)
        .json({ message });
}

export default errorHandler;