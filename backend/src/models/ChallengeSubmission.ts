import { Document, InferSchemaType, Model, Schema, model } from "mongoose";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

const challengeSubmissionSchema = new Schema(
  {
    challenge: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    language: {
      type: String,
      enum: Object.values(CompilerLanguagesEnum),
      required: true
    },
    testResults: [{
      passed: {
        type: Boolean,
        required: true
      },
      output: {
        type: String,
        required: true
      },
      time: {
        type: Number,
        required: true
      }
    }],
    passed: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

interface IChallengeSubmission extends InferSchemaType<typeof challengeSubmissionSchema> {}

interface ChallengeSubmissionModel extends Model<IChallengeSubmission> {}

const ChallengeSubmission = model<IChallengeSubmission, ChallengeSubmissionModel>("ChallengeSubmission", challengeSubmissionSchema);

export type IChallengeSubmissionDocument = IChallengeSubmission & Document;

export default ChallengeSubmission;
