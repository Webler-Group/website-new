import { ZodError } from "zod";
import { MongoServerError } from "mongodb";
import { Request, Response, NextFunction } from "express";
import { logEvents } from "./logger";
import MulterFileTypeError from "../exceptions/MulterFileTypeError";
import multer from "multer";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let errors: { message: string; field?: string; value?: any;[key: string]: any }[] = [];

  // Zod validation
  if (err instanceof ZodError) {
    errors = err.issues.map(issue => ({
      message: issue.message,
      field: issue.path.join("."),
    }));
    return res.status(400).json({ error: errors });
  }
  // Multer errors
  else if (err instanceof multer.MulterError) {
    errors.push({ message: err.field ? err.field + ": " + err.message : err.message });
    return res.status(400).json({ error: errors });
  }
  // Custom Multer file type error
  else if (err instanceof MulterFileTypeError) {
    errors.push({ message: err.message });
    return res.status(400).json({ error: errors });
  }
  // Mongoose schema validation
  else if (err.name === "ValidationError") {
    errors = Object.values(err.errors).map((e: any) => ({
      message: e.message,
      field: e.path,
      value: e.value,
    }));
  }
  // Invalid cast (e.g. bad ObjectId)
  else if (err.name === "CastError") {
    errors.push({
      message: `Invalid value for field "${err.path}"`,
      field: err.path,
      value: err.value,
    });
  }
  // MongoDB errors (e.g. duplicate key)
  else if (err instanceof MongoServerError) {
    if (err.code === 11000) {
      errors.push({
        message: "Duplicate key error",
        field: Object.keys(err.keyPattern)[0],
        value: Object.values(err.keyValue)[0],
      });
    }

    errors.push({ message: err.message });
  }
  else {
    errors.push({ message: err.message });
  }

  for (let issue of errors) {
    logEvents(`${err.name}: ${issue.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log');
  }
  console.log(err);

  res.status(500).json({ error: [{ message: "Something went wrong" }] });
};

export default errorHandler;