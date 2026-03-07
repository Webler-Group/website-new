import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

// --- Nested: RunResult ---
export class RunResult {
    @prop({ default: "" })
    stdout!: string;

    @prop({ default: "" })
    stderr!: string;

    @prop()
    time?: number;
}

// --- Nested: EvaluationResult ---
export class EvaluationResult {
    @prop()
    compileErr?: string;

    @prop({ type: () => [RunResult], default: [] })
    runResults!: RunResult[];
}

// --- Main: EvaluationJob ---
@modelOptions({ schemaOptions: { collection: "evaluationjobs", timestamps: true } })
export class EvaluationJob {
    @prop({ required: true, enum: Object.values(CompilerLanguagesEnum) })
    language!: CompilerLanguagesEnum;

    @prop({ required: true })
    source!: string;

    @prop({ type: () => [String], default: [] })
    stdin!: string[];

    @prop({ type: () => EvaluationResult })
    result?: EvaluationResult;

    @prop({ enum: ["pending", "running", "done", "error"], default: "pending" })
    status!: string;

    @prop({ required: true })
    deviceId!: string;

    @prop({ ref: "Challenge", default: null })
    challenge!: Types.ObjectId | null;

    @prop({ ref: "ChallengeSubmission", default: null })
    submission!: Types.ObjectId | null;

    @prop({ ref: "User", default: null })
    user!: Types.ObjectId | null;
}

export default getModelForClass(EvaluationJob);