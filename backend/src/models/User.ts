import { prop, getModelForClass, modelOptions, pre, DocumentType, Severity } from "@typegoose/typegoose";
import { Types } from "mongoose";
import bcrypt from "bcrypt";
import countryCodesEnum from "../config/countryCodes";
import RolesEnum from "../data/RolesEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { isEmail } from "../utils/regexUtils";
import { levelFromXp } from "../utils/levelUtils";

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

type NotificationSettings = Partial<Record<NotificationTypeEnum, boolean>>;

function buildNotificationDefaults(): Record<string, any> {
    const defaults: Record<string, any> = {};
    const notifKeys = Object.values(NotificationTypeEnum).filter(v => typeof v === "number") as NotificationTypeEnum[];
    for (const key of notifKeys) {
        defaults[key] = { type: Boolean, default: true };
    }
    return defaults;
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
    @prop({
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate: [isEmail, "invalid email"]
    })
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

    // Dynamic notification settings — stored as a plain object keyed by NotificationTypeEnum
    @prop({ type: Object, default: () => buildNotificationDefaults(), allowMixed: Severity.ALLOW })
    notifications!: NotificationSettings;

    // Optional ban subdocument (_id: false)
    @prop({ type: () => Ban, default: null, _id: false })
    ban!: Ban | null;

    @prop({ default: 0 })
    tokenVersion!: number;

    @prop()
    lastLoginAt?: Date;

    @prop({ type: () => FeedSettings, _id: false })
    feed?: FeedSettings;

    async matchPassword(this: DocumentType<User>, inputPassword: string): Promise<boolean> {
        return bcrypt.compare(inputPassword, this.password);
    }

    createdAt!: Date;
}

export const USER_MINIMAL_FIELDS = { name: 1, avatarHash: 1, countryCode: 1, level: 1, roles: 1 } as const;
export type UserMinimal = Pick<User, keyof typeof USER_MINIMAL_FIELDS>;

export const USER_ADMIN_FIELDS = { email: 1, countryCode: 1, name: 1, avatarHash: 1, roles: 1, createdAt: 1, level: 1, emailVerified: 1, active: 1, ban: 1, bio: 1 } as const;
export type UserAdmin = Pick<User, keyof typeof USER_ADMIN_FIELDS>;

const UserModel = getModelForClass(User);
export default UserModel;