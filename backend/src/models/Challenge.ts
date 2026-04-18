import { prop, getModelForClass, modelOptions, Severity, mongoose } from "@typegoose/typegoose";
import { Types } from "mongoose";
import ChallengeDifficultyEnum from "../data/ChallengeDifficultyEnum";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

export class TestCase {
    @prop({ maxlength: 500, default: "" })
    input!: string;

    @prop({ required: true, minlength: 1, maxlength: 500 })
    expectedOutput!: string;

    @prop({ default: true })
    isHidden!: boolean;
}

export class ChallengeTemplate {
    @prop({ required: true, enum: Object.values(CompilerLanguagesEnum) })
    name!: CompilerLanguagesEnum;

    @prop({ required: true })
    source!: string;
}

@modelOptions({ schemaOptions: { collection: "challenges", timestamps: true } })
export class Challenge {
    @prop({ required: true, unique: true, trim: true, minlength: 1, maxlength: 120 })
    title!: string;

    @prop({ required: true, trim: true, minlength: 1, maxlength: 4096 })
    description!: string;

    @prop({ enum: ChallengeDifficultyEnum, default: ChallengeDifficultyEnum.EASY })
    difficulty!: ChallengeDifficultyEnum;

    @prop({ type: () => [TestCase], default: [] })
    testCases!: TestCase[];

    @prop({ type: () => [ChallengeTemplate], default: [] })
    templates!: ChallengeTemplate[];

    @prop({ default: true })
    isPublic!: boolean;

    @prop({ default: 10 })
    xp!: number;

    @prop({ default: 0 })
    totalSubmissions!: number;

    @prop({ default: 0 })
    passedSubmissions!: number;

    @prop()
    solution?: string;

    @prop({ ref: "User", required: true })
    author!: Types.ObjectId;

    createdAt!: Date;
}

const ChallengeModel = getModelForClass(Challenge);
export default ChallengeModel;