import mongoose, { Schema, model, Model, InferSchemaType } from "mongoose";
import ChallengeDifficultyEnum from "../data/ChallengeDifficultyEnum";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";
import ChallengeSubmission from "./ChallengeSubmission";
import Code from "./Code";

const challengeSchema = new Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 1,
    maxLength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 4096,
    minLength: 1
  },
  difficulty: {
    type: String,
    enum: Object.values(ChallengeDifficultyEnum),
    default: ChallengeDifficultyEnum.EASY
  },
  testCases: [{
    input: {
      type: String,
      required: true,
      minLength: 1,
      maxLength: 500
    },
    expectedOutput: {
      type: String,
      required: true,
      minLength: 1,
      maxLength: 500
    },
    isHidden: {
      type: Boolean,
      default: true
    }
  }],
  templates: [{
    name: {
      type: String,
      required: true,
      enum: Object.values(CompilerLanguagesEnum)
    },
    source: {
      type: String,
      required: true
    }
  }],
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
}, { timestamps: true });

challengeSchema.statics.deleteAndCleanup = async function (filter: mongoose.FilterQuery<IChallenge>) {
  const challengesToDelete = await Challenge.find(filter).select("_id");
  const challengeIds = challengesToDelete.map(x => x._id);

  await ChallengeSubmission.deleteMany({ challenge: { $in: challengeIds } });
  await Code.deleteMany({ challenge: { $in: challengeIds } });
  await Challenge.deleteAndCleanup({ _id: challengesToDelete });
}

declare interface IChallenge extends InferSchemaType<typeof challengeSchema> {
}

interface ChallengeModel extends Model<IChallenge> {
  deleteAndCleanup(filter: mongoose.FilterQuery<IChallenge>): Promise<void>;
}

const Challenge = model<IChallenge, ChallengeModel>("Challenge", challengeSchema);

export default Challenge;
