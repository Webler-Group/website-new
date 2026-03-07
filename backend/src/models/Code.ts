import { prop, getModelForClass, modelOptions, pre } from "@typegoose/typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";
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

    @prop({ default: Date.now })
    createdAt!: Date;

    @prop({ default: Date.now })
    updatedAt!: Date;

    // --- Static ---
    static async deleteAndCleanup(
        this: ModelType<Code>,
        codeId: Types.ObjectId | string
    ): Promise<void> {
        const { default: Post } = await import("./Post");
        const { default: Upvote } = await import("./Upvote");

        await Post.deleteAndCleanup({ codeId, parentId: null });
        await Upvote.deleteMany({ parentId: codeId });
        await CodeModel.deleteOne({ _id: codeId });
    }
}

const CodeModel = getModelForClass(Code);
export default CodeModel;