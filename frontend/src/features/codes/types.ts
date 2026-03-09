import CompilerLanguagesEnum from "../../data/CompilerLanguagesEnum";
import { UserMinimal } from "../profile/types";

export interface CodeDetails<T = undefined> {
    id: string;
    name: string;
    createdAt: string;
    upadtedAt: string;
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

export interface GetJobData {
    
}

export interface CreateJobData {

}