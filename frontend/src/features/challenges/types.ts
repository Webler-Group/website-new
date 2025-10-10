export interface ITestCase {
  input?: string;
  expectedOutput?: string;
  isHidden: boolean,
}

export interface IChallengeTemplate {
  name: string;
  source: string;
}

export interface IChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  author?: string;
  templates?: IChallengeTemplate[];
  testCases: ITestCase[];
  submissions?: { language: string; passed: boolean; }[];
}

export interface ITestResult {
  output: string;
  passed: boolean;
  time?: number;
}

export interface IChallengeSubmission {
  passed: boolean;
  testResults: ITestResult[];
}