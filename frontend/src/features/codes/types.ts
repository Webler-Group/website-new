import CompilerLanguagesEnum from "../../data/CompilerLanguagesEnum";
import { UserMinimal } from "../profile/types";

export interface CodeDetails<T = undefined> {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    comments: number;
    votes: number;
    isPublic: boolean;
    language: CompilerLanguagesEnum;
    user: UserMinimal
    source: string;
    cssSource: string;
    jsSource: string;
    isUpvoted?: boolean;
    challenge: T;
}

export interface UnsavedCode {
    comments: number;
    votes: number;
    isPublic: boolean;
    language: CompilerLanguagesEnum;
    source: string;
    cssSource: string;
    jsSource: string;
}

export interface CodeMinimal<T = string> {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    comments: number;
    votes: number;
    isPublic: boolean;
    language: CompilerLanguagesEnum;
    user: T;
}

export interface CodesListData {
    count: number;
    codes: CodeMinimal<UserMinimal>[];
}

export interface GetCodeData {
    code: CodeDetails;
}

export interface GetTemplateData {
    template: {
        langauge: CompilerLanguagesEnum;
        source: string;
        cssSource: string;
        jsSource: string;
    };
}

export interface CreateCodeData {
    code: {
        id: string;
        name: string;
        language: CompilerLanguagesEnum;
        createdAt: string;
        updatedAt: string;
        source: string;
        cssSource: string;
        jsSource: string;
        isPublic: boolean;
    }
}

export interface EditCodeData {
    id: string;
    name: string;
    isPublic: boolean;
    source: string;
    cssSource: string;
    jsSource: string;
    updatedAt: string;
}

export interface VoteCodeData {
    vote: 0 | 1;
}

export interface JobDetails {
    id: string;
    deviceId: string;
    status: string;
    language: CompilerLanguagesEnum;
    stdin: string[];
    stdout: string;
    stderr: string;
}

export interface GetJobData {
    job: JobDetails;
}

export interface CreateJobData {
    jobId: string;
}

export const isCodeSaved = function<T>(code: CodeDetails<T> | UnsavedCode | null): code is CodeDetails<T> {
    return !!code && 'id' in code;
};