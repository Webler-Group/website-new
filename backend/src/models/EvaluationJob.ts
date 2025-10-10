import mongoose, { Document, InferSchemaType, Model } from "mongoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

const evaluationJobSchema = new mongoose.Schema({
    language: {
        type: String,
        required: true,
        enum: Object.values(CompilerLanguagesEnum)
    },
    source: {
        type: String,
        required: true
    },
    stdin: {
        type: [String]
    },
    result: {
        type: {
            compileErr: { type: String, required: false },
            runResults: [{
                stdout: { type: String, default: "" },
                stderr: { type: String, default: "" },
                time: { type: Number, reqired: false }
            }]
        }
    },
    status: {
        type: String,
        enum: ["pending", "running", "done", "error"],
        default: "pending"
    },
    deviceId: {
        type: String,
        required: true
    },
    challenge: {
        type: mongoose.Types.ObjectId,
        ref: "Challenge",
        default: null
    },
    submission: {
        type: mongoose.Types.ObjectId,
        ref: "ChallengeSubmission",
        default: null
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        default: null
    },
}, {
    timestamps: true
});

interface IEvaluationJob extends InferSchemaType<typeof evaluationJobSchema> {}

interface EvaluationJobModel extends Model<IEvaluationJob> {}

const EvaluationJob = mongoose.model<IEvaluationJob, EvaluationJobModel>("EvaluationJob", evaluationJobSchema);

export type IEvaluationJobDocument = IEvaluationJob & Document;

export default EvaluationJob;
