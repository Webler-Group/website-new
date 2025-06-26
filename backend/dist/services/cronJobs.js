"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const EvaluationJob_1 = __importDefault(require("../models/EvaluationJob"));
const dbUtils_1 = require("../utils/dbUtils");
const confg_1 = require("../confg");
const initCronJobs = () => {
    // This will run every day at midnight
    node_cron_1.default.schedule("0 * * * *", () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const result = yield EvaluationJob_1.default.deleteMany({
                createdAt: { $lt: new Date(Date.now() - 1000 * 60) }
            });
            console.log(`[CRON] Deleted ${result.deletedCount} old evaluation jobs`);
        }
        catch (err) {
            console.error("[CRON] Error deleting old evaluation jobs:", err);
        }
    }));
    node_cron_1.default.schedule("0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
        (0, dbUtils_1.dump)(confg_1.config.dumpDir);
    }));
};
exports.initCronJobs = initCronJobs;
