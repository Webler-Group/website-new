import mongoose, { Schema, model, Document, Model, Types } from "mongoose";
import { ChallengeSub } from "./ChallengeSub";
import { compilerLanguate_t } from "../config/compilerLanguages";

type difficulty_t = "easy" | "medium" | "hard";

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean,
}


export interface IChallengeTemplate {
  name: compilerLanguate_t;
  source: string;
}


export interface IChallenge extends Document {
  title: string;
  description: string;
  difficulty: difficulty_t;
  testCases: ITestCase[];
  templates: IChallengeTemplate[];
  xp: number,
  author: Types.ObjectId;

  addTestCase(input: string, expectedOutput: string): Promise<IChallenge>;
  addTemplate(name: compilerLanguate_t, source: string): Promise<IChallenge>;
}

interface IChallengeModel extends Model<IChallenge> {
  findByDifficulty(level: difficulty_t): Promise<IChallenge[]>;
  deleteAndCleanup(filter: mongoose.FilterQuery<IChallenge>): unknown;
}

const testCaseSchema = new Schema<ITestCase>({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, required: true }
});


const templateSchema = new Schema<IChallengeTemplate>({
  name: { type: String, required: true },
  source: { type: String }
})

const challengeSchema = new Schema<IChallenge>(
  {
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
    testCases: [testCaseSchema],
    templates: [templateSchema],
    xp: { type: Number, required: true, default: 10 },
    author: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);


challengeSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await ChallengeSub.deleteMany({ challenge: doc._id });
  }
});


challengeSchema.statics.findByDifficulty = function (level: string) {
  return this.find({ difficulty: level });
};


challengeSchema.statics.deleteAndCleanup =  async function (filter: mongoose.FilterQuery<IChallenge>) {

}

challengeSchema.methods.addTestCase = function (
  input: string,
  expectedOutput: string,
  isHidden: boolean = true
) {
  this.testCases.push({ input, expectedOutput, isHidden });
  return this.save();
};


challengeSchema.methods.addTemplate = function(name: compilerLanguate_t, source: string){
  if (!this.language.some((i: IChallengeTemplate) => i.name === name))
    this.languages.push({ name, source });
  
  return this.save();
}

const Challenge = model<IChallenge, IChallengeModel>(
  "Challenge",
  challengeSchema
);

export default Challenge;
