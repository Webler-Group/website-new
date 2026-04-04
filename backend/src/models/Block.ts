import { getModelForClass, prop, index, modelOptions } from "@typegoose/typegoose";

import { User } from "./User";
import { Types } from "mongoose";


@modelOptions({ schemaOptions: {timestamps: { createdAt: true, updatedAt: false }} })
@index({ blocker: 1, blocked: 1 }, { unique: true })
export class Block {

	@prop({ ref: () => User, required: true })
	public blocker!: Types.ObjectId;

	@prop({ ref: () => User, required: true })
	public blocked!: Types.ObjectId;

	public createdAt?: Date;
}

export const BlockModel = getModelForClass(Block);