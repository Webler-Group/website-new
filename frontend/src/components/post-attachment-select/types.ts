import CompilerLanguagesEnum from "../../data/CompilerLanguagesEnum";
import PostAttachmentTypeEnum from "../../data/PostAttachmentTypeEnum";
import { UserMinimal } from "../../features/profile/types";

export interface PostAttachmentDetails {
    id: string;
    type: PostAttachmentTypeEnum;
    user: UserMinimal;
    codeId?: string;
    codeName?: string;
    codeLanguage?: CompilerLanguagesEnum;
    questionId?: string;
    questionTitle?: string;
    feedId?: string;
    feedMessage?: string;
}