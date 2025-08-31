"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const EvaluationJob_1 = __importDefault(require("../models/EvaluationJob"));
const dbUtils_1 = require("../utils/dbUtils");
const confg_1 = require("../confg");
const logger_1 = require("../middleware/logger");
const initCronJobs = () => {
    // This will run every day at midnight
    node_cron_1.default.schedule("0 * * * *", async () => {
        try {
            const result = await EvaluationJob_1.default.deleteMany({
                createdAt: { $lt: new Date(Date.now() - 1000 * 60) }
            });
            (0, logger_1.logEvents)(`Deleted ${result.deletedCount} old evaluation jobs`, "cronLog.log");
        }
        catch (err) {
            (0, logger_1.logEvents)("Deleting old evaluation jobs failed with error: " + err.message, "cronErrLog.log");
        }
    });
    node_cron_1.default.schedule("0 0 * * *", async () => {
        (0, dbUtils_1.dump)(confg_1.config.dumpDir);
    });
};
exports.initCronJobs = initCronJobs;
