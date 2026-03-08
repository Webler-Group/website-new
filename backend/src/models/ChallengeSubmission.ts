import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

// --- Nested: TestResult ---
export class TestResult {
    @prop({ required: true })
    passed!: boolean;

    @prop()
    output?: string;

    @prop()
    stderr?: string;

    @prop()
    time?: number;
}

// --- Main: ChallengeSubmission ---
@modelOptions({ schemaOptions: { collection: "challengesubmissions", timestamps: true } })
export class ChallengeSubmission {
    @prop({ ref: "Challenge", required: true })
    challenge!: Types.ObjectId;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ default: 0 })
    reward!: number;

    @prop({ required: true, enum: CompilerLanguagesEnum })
    language!: CompilerLanguagesEnum;

    @prop({ type: () => [TestResult], default: [] })
    testResults!: TestResult[];

    @prop({ default: false })
    passed!: boolean;

    @prop()
    source?: string;

    createdAt!: Date;
}

const ChallengeSubmissionModel = getModelForClass(ChallengeSubmission);
export default ChallengeSubmissionModel;