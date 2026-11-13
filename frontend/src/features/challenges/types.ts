import type { XpAward } from "../../context/xpRewardContext";
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
  tags: string[];
  submissions?: ChallengeSubmissionMinimal[];
  totalSubmissions?: number;
  isPublic: boolean;
  solution?: string;
  isUnlocked?: boolean;
  /** Language of the user's latest test run, when that language isn't solved yet */
  lastAttemptLanguage?: CompilerLanguagesEnum | null;
  /** CPU time limit per test in ms; absent when the challenge has none */
  timeLimit?: number | null;
}

export interface ChallengeMinimal {
    id: string;
    title: string;
    difficulty: ChallengeDifficultyEnum;
    acceptance?: number;
    isSolved?: boolean;
    isUnlocked?: boolean;
    hasSolution?: boolean;
    submissions?: { language: string; passed: boolean }[];
    totalSubmissions?: number;
    tags?: string[];
}

export interface ChallengeCollectionMinimal {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  sectionCount: number;
  challengeCount: number;
  solvedCount: number;
}

export interface ChallengeCollectionItem {
  id: string;
  title: string;
  difficulty: ChallengeDifficultyEnum;
  xp: number;
  isPublic: boolean;
  tags: string[];
  isSolved: boolean;
}

export interface ChallengeCollectionSection {
  title: string;
  description: string;
  challenges: ChallengeCollectionItem[];
}

export interface ChallengeCollectionDetails {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  sections: ChallengeCollectionSection[];
}

export interface ChallengeTagCount {
  name: string;
  count: number;
}

export interface ChallengeTagsData {
  tags: ChallengeTagCount[];
}

export interface ChallengeSearchItem {
  id: string;
  title: string;
  difficulty: ChallengeDifficultyEnum;
  isPublic: boolean;
}

export interface SearchChallengesData {
  challenges: ChallengeSearchItem[];
}

export interface SaveChallengeCollectionData {
  collection: { id: string };
}

export interface ChallengeCollectionListData {
  collections: ChallengeCollectionMinimal[];
}

export interface GetChallengeCollectionData {
  collection: ChallengeCollectionDetails;
}

export type ChallengeTestVerdict =
  | "accepted"
  | "wrongAnswer"
  | "timeLimitExceeded"
  | "memoryLimitExceeded"
  | "outputLimitExceeded"
  | "runtimeError"
  | "compileError"
  | "notRun";

export interface ChallengeTestResult {
  passed: boolean;
  /** Missing in results saved before verdicts were stored */
  verdict?: ChallengeTestVerdict;
  /**
   * Copy of the test case the result belongs to. Missing in results saved before the copy was
   * stored; input and expected output are also missing for hidden tests.
   */
  isHidden?: boolean;
  input?: string;
  expectedOutput?: string;
  output?: string;
  stderr?: string;
  /** Seconds of CPU time */
  time?: number;
  /** Peak memory in KB */
  memory?: number;
}

export interface ChallengeSubmissionMinimal {
  language: string;
  passed: boolean;
}

export interface ChallengeSubmissionDetails {
  passed: boolean;
  testResults: ChallengeTestResult[];
  /** Time limit the results were judged with (ms) */
  timeLimit?: number;
}

export interface ChallengeJobDetails {
  id: string;
  deviceId: string;
  status: string;
  language: CompilerLanguagesEnum;
  submission: ChallengeSubmissionDetails | null;
  /** XP the current user gained by this evaluation */
  xpAwarded: XpAward | null;
}

export interface CreateChallengeData {
  challenge: {
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
  language: CompilerLanguagesEnum;
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
  difficulty: ChallengeDifficultyEnum;
  testCases: ChallengeTestCase[];
  templates: ChallengeTemplate[];
  xp: number;
  isPublic: boolean;
  solution: string;
  timeLimit?: number;
}

export interface CreateChallengeJobData {
  jobId: string;
}

export interface GetChallengeJobData {
  job: ChallengeJobDetails;
}