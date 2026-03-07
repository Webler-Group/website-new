import { prop, getModelForClass, modelOptions, pre, DocumentType } from "@typegoose/typegoose";
import { Types } from "mongoose";
import bcrypt from "bcrypt";
import countryCodesEnum from "../config/countryCodes";
import RolesEnum from "../data/RolesEnum";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { isEmail } from "../utils/regexUtils";
import { levelFromXp } from "../utils/levelUtils";

// --- Nested: Ban (_id: false) ---
@modelOptions({ schemaOptions: { _id: false } })
export class Ban {
    @prop({ ref: "User", required: true })
    author!: Types.ObjectId;

    @prop({ trim: true, maxlength: 120 })
    note?: string;

    @prop({ required: true })
    date!: Date;
}

// --- Nested: FeedSettings (no _id needed) ---
@modelOptions({ schemaOptions: { _id: false } })
export class FeedSettings {
    @prop()
    filter?: number;
}

// --- Nested: NotificationSettings (dynamic keys from enum) ---
// Typed as a plain record since keys are dynamic numeric enum values
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

    if (this.isModified("active")) {
        const { default: Post } = await import("./Post");
        const { default: Code } = await import("./Code");
        const { default: Notification } = await import("./Notification");

        await Post.updateMany({ user: this._id }, { $set: { hidden: !this.active } });
        await Code.updateMany({ user: this._id }, { $set: { hidden: !this.active } });
        await Notification.updateMany({ actionUser: this._id }, { $set: { hidden: !this.active } });
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

    @prop({ enum: countryCodesEnum, default: "" })
    countryCode!: string;

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
    @prop({ type: Object, default: () => buildNotificationDefaults() })
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

    // --- Instance method ---
    async matchPassword(this: DocumentType<User>, inputPassword: string): Promise<boolean> {
        return bcrypt.compare(inputPassword, this.password);
    }
}

export const USER_MINIMAL_FIELDS = { name: 1, avatarHash: 1, countryCode: 1, level: 1, roles: 1 } as const;
export type UserMinimal = Pick<User, keyof typeof USER_MINIMAL_FIELDS>;

const UserModel = getModelForClass(User);
export default UserModel;