"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const mongodb_1 = require("mongodb");
const logger_1 = require("./logger");
const MulterFileTypeError_1 = __importDefault(require("../exceptions/MulterFileTypeError"));
const multer_1 = __importDefault(require("multer"));
const errorHandler = (err, req, res, next) => {
    let errors = [];
    // Zod validation
    if (err instanceof zod_1.ZodError) {
        errors = err.issues.map(issue => ({
            message: issue.message,
            field: issue.path.join("."),
        }));
        return res.status(400).json({ error: errors });
    }
    // Multer errors
    else if (err instanceof multer_1.default.MulterError) {
        errors.push({ message: err.field ? err.field + ": " + err.message : err.message });
        return res.status(400).json({ error: errors });
    }
    // Custom Multer file type error
    else if (err instanceof MulterFileTypeError_1.default) {
        errors.push({ message: err.message });
        return res.status(400).json({ error: errors });
    }
    // Mongoose schema validation
    else if (err.name === "ValidationError") {
        errors = Object.values(err.errors).map((e) => ({
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
    else if (err instanceof mongodb_1.MongoServerError) {
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
        (0, logger_1.logEvents)(`${err.name}: ${issue.message}\t${req.method}\t${req.url}\t${req.headers.origin}`, 'errLog.log');
    }
    console.log(err);
    res.status(500).json({ error: [{ message: "Something went wrong" }] });
};
exports.errorHandler = errorHandler;
exports.default = exports.errorHandler;
