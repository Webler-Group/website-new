import { prop, getModelForClass, modelOptions, pre } from "@typegoose/typegoose";
import { Types } from "mongoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

@pre<Code>("save", function () {
    if (
        this.isModified("source") ||
        this.isModified("cssSource") ||
        this.isModified("jsSource")
    ) {
        this.set("updatedAt", new Date());
    }
})
@modelOptions({ schemaOptions: { collection: "codes" } })
export class Code {
    @prop({ ref: "User", required: true })
    user!: Types.ObjectId;

    @prop({ default: 0 })
    votes!: number;

    @prop({ default: 0 })
    comments!: number;

    @prop({ required: true, trim: true, minlength: 1, maxlength: 120 })
    name!: string;

    @prop({ required: true, enum: CompilerLanguagesEnum })
    language!: CompilerLanguagesEnum;

    @prop({ default: false })
    isPublic!: boolean;

    @prop({ default: "" })
    source!: string;

    @prop({ default: "" })
    cssSource!: string;

    @prop({ default: "" })
    jsSource!: string;

    @prop({ default: false })
    hidden!: boolean;

    @prop({ ref: "Challenge", default: null })
    challenge!: Types.ObjectId | null;

    @prop({ default: Date.now() })
    createdAt!: Date;
    
    @prop({ default: Date.now() })
    updatedAt!: Date;
}

export const CODE_MINIMAL_FIELDS = { name: 1, language: 1, isPublic: 1, votes: 1, comments: 1, user: 1, createdAt: 1, updatedAt: 1 } as const;
export type CodeMinimal = Pick<Code, keyof typeof CODE_MINIMAL_FIELDS>;

const CodeModel = getModelForClass(Code);
export default CodeModel;