import ChallengeDifficultyEnum from "../../data/ChallengeDifficultyEnum";
import CompilerLanguagesEnum from "../../data/CompilerLanguagesEnum";
import { CodeDetails } from "../codes/types";

export interface ChallengeTestCase {
  id: string;
  input?: string;
  expectedOutput?: string;
  isHidden: boolean,
}

export interface ChallengeTemplate {
  name: string;
  source: string;
}

export interface ChallengeDetails {
  id: string;
  title: string;
  description: string;
  xp: number;
  difficulty: ChallengeDifficultyEnum;
  templates: ChallengeTemplate[];
  testCases: ChallengeTestCase[];
  submissions?: ChallengeSubmissionMinimal[];
  isPublic: boolean;
}

export interface ChallengeMinimal {
  id: string;
  title: string;
  difficulty: ChallengeDifficultyEnum;
  submissions?: ChallengeSubmissionMinimal[];
}

export interface ChallengeTestResult {
  output?: string;
  stderr?: string;
  passed: boolean;
  time?: number;
}

export interface ChallengeSubmissionMinimal {
  language: string;
  passed: boolean;
}

export interface ChallengeSubmissionDetails {
  passed: boolean;
  testResults: ChallengeTestResult[];
}

export interface ChallengeJobDetails {
  id: string;
  deviceId: string;
  status: string;
  langauge: CompilerLanguagesEnum;
  submission: ChallengeSubmissionDetails | null;
}

export interface CreateChallengeData {
  challege: {
    id: string;
  }
}

export interface ChallengeListData {
  count: number;
  challenges: ChallengeMinimal[];
}

export interface GetChallengeData {
  challenge: ChallengeDetails;
}

export type ChallengeCodeDetails = CodeDetails<{ id: string; lastSubmission?: ChallengeSubmissionDetails }>;

export interface GetChallengeCodeData {
  code: ChallengeCodeDetails;
}

export interface SaveChallengeCodeData {
  id: string;
  langauge: CompilerLanguagesEnum;
  createdAt: string;
  updatedAt: string;
  source: string;
  challengeId: string;
}

export interface GetEditedChallengeData {
  challenge: ChallengeDetails;
}

export interface EditChallengeData {
  id: string;
  title: string;
  description: string;
  difficlty: ChallengeDifficultyEnum;
  testCases: ChallengeTestCase[];
  templates: ChallengeTemplate[];
  xp: number;
  isPublic: boolean;
}

export interface CreateChallengeJobData {
  jobId: string;
}

export interface GetChallengeJobData {
  job: ChallengeJobDetails;
}