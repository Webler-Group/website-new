import { Schema, model, Document, Model, Types } from "mongoose";

type difficulty_t = "easy" | "medium" | "hard";

interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean,
}

export interface IChallenge extends Document {
  title: string;
  description: string;
  difficulty: difficulty_t;
  tags: string[];
  testCases: ITestCase[];
  xp: number,
  createdBy?: Types.ObjectId;

  addTestCase(input: string, expectedOutput: string): Promise<IChallenge>;
}

interface IChallengeModel extends Model<IChallenge> {
  findByDifficulty(level: difficulty_t): Promise<IChallenge[]>;
  searchByTag(tag: string): Promise<IChallenge[]>;
}

const testCaseSchema = new Schema<ITestCase>({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, required: true }
});

const challengeSchema = new Schema<IChallenge>(
  {
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    tags: [{ type: String }],
    testCases: [testCaseSchema],
    xp: { type: Number, required: true, default: 10 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

challengeSchema.statics.findByDifficulty = function (level: string) {
  return this.find({ difficulty: level });
};

challengeSchema.statics.searchByTag = function (tag: string) {
  return this.find({ tags: tag });
};

challengeSchema.methods.addTestCase = function (
  input: string,
  expectedOutput: string,
  isHidden: boolean = true
) {
  this.testCases.push({ input, expectedOutput, isHidden });
  return this.save();
};

const Challenge = model<IChallenge, IChallengeModel>(
  "Challenge",
  challengeSchema
);

export default Challenge;
