import { prop, getModelForClass, modelOptions, pre, DocumentType } from "@typegoose/typegoose";
import { Types } from "mongoose";
import bcrypt from "bcrypt";
import countryCodesEnum from "../data/countryCodes";
import RolesEnum from "../data/RolesEnum";
import { isEmail } from "../utils/regexUtils";
import { levelFromXp } from "../helpers/userHelper";

@modelOptions({ schemaOptions: { _id: false } })
export class NotificationSettings {
    @prop({ default: true })
    profileFollow!: boolean;

    @prop({ default: true })
    qaAnswer!: boolean;

    @prop({ default: true })
    codeComment!: boolean;

    @prop({ default: true })
    qaQuestionMention!: boolean;

    @prop({ default: true })
    qaAnswerMention!: boolean;

    @prop({ default: true })
    codeCommentMention!: boolean;

    @prop({ default: true })
    feedFollowerPost!: boolean;

    @prop({ default: true })
    feedComment!: boolean;

    @prop({ default: true })
    feedShare!: boolean;

    @prop({ default: true })
    feedPin!: boolean;

    @prop({ default: true })
    feedCommentMention!: boolean;

    @prop({ default: true })
    lessonComment!: boolean;

    @prop({ default: true })
    lessonCommentMention!: boolean;

    @prop({ default: true })
    channels!: boolean;
}

@modelOptions({ schemaOptions: { _id: false } })
export class Ban {
    @prop({ ref: "User", required: true })
    author!: Types.ObjectId;

    @prop({ trim: true, maxlength: 120 })
    note?: string;

    @prop({ required: true })
    date!: Date;
}

@modelOptions({ schemaOptions: { _id: false } })
export class FeedSettings {
    @prop()
    filter?: number;
}

@pre<User>("save", async function () {
    if (this.isModified("password")) {
        if (this.password.length < 6) {
            throw new Error("Password must contain at least 6 characters");
        }
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified("xp")) {
        this.level = levelFromXp(this.xp);
    }
})
@modelOptions({ schemaOptions: { collection: "users", timestamps: true } })
export class User {
    @prop({ required: true, unique: true, trim: true, lowercase: true, validate: [isEmail, "invalid email"] })
    email!: string;

    @prop({ required: true })
    password!: string;

    @prop({ required: true, trim: true, minlength: 3, maxlength: 20, unique: true })
    name!: string;

    @prop({ enum: countryCodesEnum })
    countryCode?: string;

    @prop({ trim: true, maxlength: 120, default: "" })
    bio!: string;

    @prop({ type: () => [String], default: [RolesEnum.USER], enum: Object.values(RolesEnum) })
    roles!: RolesEnum[];

    @prop({ default: false })
    emailVerified!: boolean;

    @prop({ default: 0 })
    lastVerificationEmailTimestamp!: number;

    @prop({ default: true })
    active!: boolean;

    @prop({ default: 1 })
    level!: number;

    @prop({ default: 0 })
    xp!: number;

    @prop({ ref: "File" })
    avatarFileId?: Types.ObjectId;

    @prop()
    avatarHash?: string;

    @prop({ type: () => NotificationSettings, default: () => new NotificationSettings(), _id: false })
    notifications!: NotificationSettings;

    @prop({ type: () => Ban, default: null, _id: false })
    ban!: Ban | null;

    @prop({ default: 0 })
    tokenVersion!: number;

    @prop()
    lastLoginAt?: Date;

    @prop({ type: () => FeedSettings, _id: false })
    feed?: FeedSettings;

    @prop({ ref: "Ip", type: () => [Types.ObjectId], default: [] })
    ips!: Types.ObjectId[];

    @prop({ ref: "Ip" })
    lastIp?: Types.ObjectId;

    async matchPassword(this: DocumentType<User>, inputPassword: string): Promise<boolean> {
        return bcrypt.compare(inputPassword, this.password);
    }

    createdAt!: Date;
}

export const USER_MINIMAL_FIELDS = { _id: 1, name: 1, avatarHash: 1, countryCode: 1, level: 1, roles: 1, active: 1 } as const;
export type UserMinimal = Pick<User & { _id: Types.ObjectId }, keyof typeof USER_MINIMAL_FIELDS>;

export const USER_ADMIN_MINIMAL_FIELDS = { _id: 1, email: 1, countryCode: 1, name: 1, avatarHash: 1, roles: 1, createdAt: 1, level: 1, emailVerified: 1, active: 1, lastLoginAt: 1 } as const;
export type UserAdminMinimal = Pick<User & { _id: Types.ObjectId }, keyof typeof USER_ADMIN_MINIMAL_FIELDS>;

const UserModel = getModelForClass(User);
export default UserModel;