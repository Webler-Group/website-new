import { compilerLanguages } from "../../../data/compilerLanguages";
import { LinkContainer } from "react-router-bootstrap";

interface IPostAttachment {
    id: string;
    type: number;
    userId: string;
    userName: string;
    userAvatar: string;
    codeId: string;
    feedId: string;
    feedMessage: string;
    codeName: string;
    codeLanguage: compilerLanguages;
    questionId: string;
    questionTitle: string;
}

interface PostAttachmentProps {
    data: IPostAttachment;
}

const PostAttachment = ({ data }: PostAttachmentProps) => {
    let title = "";
    let subtitle = "";
    let to = "#";
    let info = "";

    switch (data.type) {
        case 1: // Code
            title = data.codeName || "Untitled Code";
            subtitle = `${data.codeLanguage} • ${data.userName}`;
            to = `/Compiler-Playground/${data.codeId}`;
            info = "code";
            break;

        case 2: // Question / Discussion
            title = data.questionTitle || "Question";
            subtitle = `${data.userName}`;
            to = `/Discuss/${data.questionId}`;
            info = "question";
            break;

        case 4: // Feed
            title = `${data.feedMessage}`;
            subtitle = `${data.userName}`;
            to = `/feed/${data.feedId}`;
            info = "post";
            break;

        default:
            return null;
    }

    return (
        <LinkContainer to={to} style={{ cursor: "pointer" }}>
            <div className="d-flex flex-column border shadow-sm rounded-3 bg-white p-2">
                <div className="d-flex gap-2 justify-content-between">
                    <h6 className="fw-semibold" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>{title}</h6>
                    <div className="small text-muted" style={{ whiteSpace: "nowrap" }}>{info}</div>
                </div>
                <div className="small text-muted">{subtitle}</div>
            </div>
        </LinkContainer>
    );
}

export type {
    IPostAttachment
}

export default PostAttachment