export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean,
  passed?: boolean
}

export interface IChallengeTemplate {
  name: string;
  source: string;
}

export default interface IChallenge {
    id: string;
    title: string;
    description: string;
    xp: number;
    difficulty: "easy" | "medium" | "hard";
    author?: string;
    templates?: IChallengeTemplate[];
    testCases?: ITestCase[];
}