"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const confg_1 = require("../confg");
const logger_1 = require("../middleware/logger");
const connectDB = async () => {
    mongoose_1.default.connection.once("open", () => {
        console.log("Connected to DB successfully");
    });
    mongoose_1.default.connection.once("error", (err) => {
        (0, logger_1.logEvents)(`${err.name}: ${err.message}`, 'mongoErrLog.log');
    });
    await mongoose_1.default.connect(confg_1.config.databaseUri);
};
exports.default = connectDB;
