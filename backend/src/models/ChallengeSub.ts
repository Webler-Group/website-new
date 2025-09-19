import { Schema, model, Document, Types } from "mongoose";
import User from "./User";
import Challenge from "./Challenge";

export interface IChallengeSub extends Document {
  challenge: Types.ObjectId;     // reference to Challenge
  user: Types.ObjectId;          // reference to User
  language: string;              // e.g. "python", "javascript"
  code: string;                  // submitted code
  codeLength: number;            // code.length
  status: "pending" | "passed" | "failed"; // result after test cases
  executionTime?: number;        // runtime in ms
  memoryUsed?: number;           // memory usage in KB
  createdAt: Date;
  updatedAt: Date;
  hasPassed: boolean;
}

const ChallengeSubSchema = new Schema<IChallengeSub>(
  {
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    codeLength: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "passed", "failed"],
      default: "pending"
    },
    executionTime: { type: Number },
    memoryUsed: { type: Number },
    hasPassed: { type: Boolean, default: false },
  },
  { timestamps: true }
);


ChallengeSubSchema.pre("save", async function (next) {
  if (!this.isModified("status") || this.hasPassed) return next();

  const sub = this as IChallengeSub;

  // Only reward if status changed to passed
  if (sub.status === "passed") {
    try {
      const challenge = await Challenge.findById(sub.challenge);
      await User.findByIdAndUpdate(sub.user, { $inc: { xp: (challenge?.xp) || 0 } });
      sub.hasPassed = true;
    } catch (err) {
      return next(err as any);
    }
  }

  next();
});

export const ChallengeSub = model<IChallengeSub>("ChallengeSub", ChallengeSubSchema);
