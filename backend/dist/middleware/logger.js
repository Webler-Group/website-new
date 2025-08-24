"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.logEvents = void 0;
const date_fns_1 = require("date-fns");
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const confg_1 = require("../confg");
const logEvents = async (message, logFileName) => {
    const dateTime = (0, date_fns_1.format)(new Date(), 'yyyyMMdd\tHH:mm:ss');
    const logItem = `${dateTime}\t${(0, uuid_1.v4)()}\t${message}\n`;
    console.log(message);
    try {
        if (!fs_1.default.existsSync(confg_1.config.logDir)) {
            await fs_1.default.promises.mkdir(confg_1.config.logDir);
        }
        await fs_1.default.promises.appendFile(path_1.default.join(confg_1.config.logDir, logFileName), logItem);
    }
    catch (err) {
        console.log(err);
    }
};
exports.logEvents = logEvents;
const logger = (req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
};
exports.logger = logger;
