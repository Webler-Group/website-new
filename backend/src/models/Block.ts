import { getModelForClass, prop, index, Ref, modelOptions } from "@typegoose/typegoose";

import { User } from "./User";


@modelOptions({ schemaOptions: {timestamps: { createdAt: true, updatedAt: false }} })
@index({ blocker: 1, blocked: 1 }, { unique: true })
export class Block {

	@prop({ ref: () => User, required: true })
	public blocker!: Ref<User>;

	@prop({ ref: () => User, required: true })
	public blocked!: Ref<User>;

	public createdAt?: Date;

	public static async isBlocked(userA: string, userB: string) {
		return await BlockModel.exists({
		$or: [
			{ blocker: userA, blocked: userB },
			{ blocker: userB, blocked: userA }
		]
		});
	}

	public static async hasBlocked(blocker: string, target: string) {
		return await BlockModel.exists({
			blocker,
			blocked: target
		});
	}
}

export const BlockModel = getModelForClass(Block);