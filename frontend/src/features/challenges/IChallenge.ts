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

export default interface IChallenge {
    title: string;
    description: string;
    tags: string[];
    testCases: ITestCase[];
    xp: number;
    difficulty?: string;
    createdBy?: string;
}