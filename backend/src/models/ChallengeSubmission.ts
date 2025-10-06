import { Schema, model, Document, Types } from "mongoose";
import User from "./User";
import Challenge from "./Challenge";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

const challengeSubmissionSchema = new Schema(
  {
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    language: { type: String, enum: Object.values(CompilerLanguagesEnum), required: true },
    executionTime: { type: Number },
    memoryUsed: { type: Number },
    hasPassed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const ChallengeSubmission = model("ChallengeSubmission", challengeSubmissionSchema);

export default ChallengeSubmission;
