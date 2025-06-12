import mongoose, { InferSchemaType, Model } from "mongoose";
import compilerLanguagesEnum from "../config/compilerLanguages";

const evaluationJobSchema = new mongoose.Schema({
    language: {
        type: String,
        required: true,
        enum: compilerLanguagesEnum
    },
    source: {
        type: String,
        required: true
    },
    stdin: {
        type: String,
        required: false
    },
    stdout: {
        type: String,
        required: false
    },
    stderr: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ["pending", "running", "done", "error"],
        default: "pending"
    }
}, {
    timestamps: true
});

declare interface IEvaluationJob extends InferSchemaType<typeof evaluationJobSchema> {}

interface EvaluationJobModel extends Model<IEvaluationJob> {
}

const EvaluationJob = mongoose.model<IEvaluationJob, EvaluationJobModel>("EvaluationJob", evaluationJobSchema);

export default EvaluationJob;
