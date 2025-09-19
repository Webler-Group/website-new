export type challenge_diff_t = "easy" | "medium" | "hard";

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean,
  passed?: boolean
}

export interface IChallengeFilter {
  solved: boolean;
  difficulty?: challenge_diff_t;
}


export interface IChallengeTemplate {
  name: string;
  source: string;
}

export default interface IChallenge {
    _id: string;
    title: string;
    description: string;
    xp: number;
    difficulty: string;
    createdBy?: string;
    templates?: IChallengeTemplate[];
    testCases?: ITestCase[];
}