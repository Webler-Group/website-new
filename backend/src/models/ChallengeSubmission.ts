import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { Types } from "mongoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import TestVerdictEnum from "../data/TestVerdictEnum";

// --- Nested: TestResult ---
export class TestResult {
    @prop({ required: true })
    passed!: boolean;

    // Copy of the test case at the time of the submission, so editing the challenge later doesn't
    // pair new test cases with old results. Missing in results saved before the copy was added.
    @prop()
    input?: string;

    @prop()
    expectedOutput?: string;

    @prop()
    isHidden?: boolean;

    @prop({ enum: TestVerdictEnum })
    verdict?: TestVerdictEnum;

    @prop()
    output?: string;

    @prop()
    stderr?: string;

    // Seconds of CPU time
    @prop()
    time?: number;

    // Peak memory in KB
    @prop()
    memory?: number;
}

// --- Main: ChallengeSubmission ---
@modelOptions({ schemaOptions: { collection: "challengesubmissions", timestamps: true } })
export class ChallengeSubmission {
    @prop({ ref: "Challenge", required: true })
    challenge!: Types.ObjectId;

    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ required: true, enum: CompilerLanguagesEnum })
    language!: CompilerLanguagesEnum;

    @prop({ type: () => [TestResult], default: [] })
    testResults!: TestResult[];

    // The challenge's time limit (ms) the latest test results were judged with
    @prop()
    timeLimit?: number;

    @prop({ default: false })
    passed!: boolean;

    @prop({ default: false })
    everPassed!: boolean;

    @prop()
    source?: string;

    createdAt!: Date;
}

const ChallengeSubmissionModel = getModelForClass(ChallengeSubmission);
export default ChallengeSubmissionModel;