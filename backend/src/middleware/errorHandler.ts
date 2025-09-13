import { Request, Response, NextFunction } from "express";
import { logEvents } from "./logger";
import { CastError } from "mongoose";
import { ZodError } from "zod";

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: err.issues,
    });
    return
  }

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