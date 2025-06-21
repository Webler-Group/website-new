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
const dbConn_1 = __importDefault(require("../config/dbConn"));
const EvaluationJob_1 = __importDefault(require("../models/EvaluationJob"));
const BoxIdPool_1 = require("../utils/BoxIdPool");
const isolate_1 = require("../utils/isolate");
const boxIdPool = new BoxIdPool_1.BoxIdPool(100, 10000);
const CONCURRENCY = 4;
function processSingleJob(job) {
    return __awaiter(this, void 0, void 0, function* () {
        const boxId = yield boxIdPool.acquire();
        try {
            job.status = "running";
            yield job.save();
            console.log(`Running job ${job._id} in box ${boxId}`);
            const { stderr, stdout } = yield (0, isolate_1.runInIsolate)(job.source, job.language, boxId, job.stdin);
            job.status = "done";
            job.stdout = stdout;
            job.stderr = stderr;
            console.log(`Job ${job._id} is done`);
        }
        catch (err) {
            job.status = "error";
            job.stderr = err.message;
            console.log(`Job ${job._id} failed with error: ${err.message}`);
        }
        finally {
            boxIdPool.release(boxId);
            yield job.save();
        }
    });
}
function processJobs() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, dbConn_1.default)();
        while (true) {
            const jobs = yield EvaluationJob_1.default.find({ status: "pending" }).limit(CONCURRENCY);
            if (jobs.length === 0) {
                yield new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            yield Promise.all(jobs.map(job => processSingleJob(job)));
        }
    });
}
processJobs().catch(err => {
    console.error("Worker crashed:", err);
    process.exit(1);
});
