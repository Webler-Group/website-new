import mongoose, { InferSchemaType, Model } from "mongoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

const jobResultSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    stdout: { type: String, required: false },
    stderr: { type: String, required: false },
  },
  { _id: false }
);

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
        type: [jobResultSchema]
    },
    status: {
        type: String,
        enum: ["pending", "running", "done", "error"],
        default: "pending"
    },
    deviceId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

declare interface IEvaluationJob extends InferSchemaType<typeof evaluationJobSchema> {}

interface EvaluationJobModel extends Model<IEvaluationJob> {
}

const EvaluationJob = mongoose.model<IEvaluationJob, EvaluationJobModel>("EvaluationJob", evaluationJobSchema);

export default EvaluationJob;
