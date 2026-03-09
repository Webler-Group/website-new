import CompilerLanguagesEnum from "../../data/CompilerLanguagesEnum";

export interface CodeMinimal<T = string> {
    id: string;
    name: string;
    createdAt: string;
    upadtedAt: string;
    comments: number;
    votes: number;
    isPublic: boolean;
    language: CompilerLanguagesEnum;
    user: T;
}