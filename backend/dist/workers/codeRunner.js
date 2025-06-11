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
function processJobs() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, dbConn_1.default)();
        while (true) {
            const job = yield EvaluationJob_1.default.findOne({ status: "pending" });
            if (!job) {
                yield new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            job.status = "running";
            yield job.save();
            console.log(`Running job ${job._id}`);
            const boxId = yield boxIdPool.acquire();
            try {
                const { stderr, stdout } = yield (0, isolate_1.runInIsolate)(job.source, job.language, boxId, job.stdin);
                job.status = "done";
                job.stdout = stdout;
                job.stderr = stderr;
            }
            catch (err) {
                job.status = "error";
                job.stderr = err.message;
            }
            finally {
                boxIdPool.release(boxId);
            }
            yield job.save();
        }
    });
}
processJobs().catch(err => {
    console.error("Worker crashed:", err);
    process.exit(1);
});
