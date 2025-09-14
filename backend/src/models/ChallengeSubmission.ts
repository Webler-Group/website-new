import { Schema, model, Document, Model, Types } from "mongoose";

export type Language =
    | "python"
    | "javascript"
    | "cpp"
    | "c"
    | "lua";

export interface IChallengeSubmission extends Document {
  challenge: Types.ObjectId;
  user: Types.ObjectId;
  code: string;
  language: Language;
  status: "pending" | "accepted" | "wrong" | "error";
  executionTime?: number;
  memory?: number;
  resultOutput?: string;

  updateStatus(status: IChallengeSubmission["status"], resultOutput: string): Promise<IChallengeSubmission>;
}

interface ISubmissionModel extends Model<IChallengeSubmission> {
  findByUser(userId: Types.ObjectId): Promise<IChallengeSubmission[]>;
  findByChallenge(challengeId: Types.ObjectId): Promise<IChallengeSubmission[]>;
}

const submissionSchema = new Schema<IChallengeSubmission>(
  {
    challenge: { type: Schema.Types.ObjectId, ref: "Challenge", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true },
    language: {
      type: String,
      enum: ["python", "javascript", "cpp", "c", "lua"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "wrong", "error"],
      default: "pending",
    },
    executionTime: { type: Number },
    memory: { type: Number },
    resultOutput: { type: String },
  },
  { timestamps: true }
);


submissionSchema.statics.findByUser = function (userId: Types.ObjectId) {
  return this.find({ user: userId }).populate("challenge");
};

submissionSchema.statics.findByChallenge = function (challengeId: Types.ObjectId) {
  return this.find({ challenge: challengeId }).populate("user");
};

// 🔹 Methods
submissionSchema.methods.updateStatus = function (
  status: IChallengeSubmission["status"],
  resultOutput: string
) {
  this.status = status;
  this.resultOutput = resultOutput;
  return this.save();
};

const ChallengeSubmission = model<IChallengeSubmission, ISubmissionModel>(
  "ChallengeSubmission",
  submissionSchema
);

export default ChallengeSubmission;
