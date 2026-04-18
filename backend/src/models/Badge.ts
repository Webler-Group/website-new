import { prop, getModelForClass } from "@typegoose/typegoose";

export class Badge {
  @prop({ required: true, unique: true })
  key!: string;     // "email_verified"..

  @prop({ required: true })
  description!: string;

  @prop({ required: true })
  icon!: string;

  @prop({ default: 0 })
  xpReward!: number;
}

const BadgeModel = getModelForClass(Badge);
export default BadgeModel;