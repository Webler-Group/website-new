import { Link } from "react-router-dom";
import { compilerLanguages } from "../../../data/compilerLanguages";
import { truncate } from "../../../utils/StringUtils";

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
    let bgColor = "";
    let info = "";

    switch (data.type) {
        case 1: // Code
            title = data.codeName || "Untitled Code";
            subtitle = `${data.codeLanguage} • ${data.userName}`;
            to = `/Compiler-Playground/${data.codeId}`;
            bgColor = "bg-primary";
            info = "code";
            break;

        case 2: // Question / Discussion
            title = data.questionTitle || "Question";
            subtitle = `${data.userName}`;
            to = `/Discuss/${data.questionId}`;
            bgColor = "bg-success";
            info = "question";
            break;

        case 4: // Feed
            title = `${truncate(data.feedMessage, 20)}`;
            subtitle = `${data.userName}`;
            to = `/feed/${data.feedId}`;
            bgColor = "bg-info";
            info = "post";
            break;

        default:
            return null;
    }

    return (
        <Link
            to={to}
            className="d-flex align-items-center gap-3 p-2 border rounded-3 bg-white text-decoration-none shadow-sm position-relative overflow-hidden"
            style={{
                transition: "all 0.2s ease",
                borderLeft: `4px solid var(--bs-${bgColor.split('-')[1]})`
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
            }}
        >
            <div className="d-flex justify-content-between align-items-start flex-grow-1 min-w-0">
                <div className="min-w-0">
                    <h6 className="fw-semibold mb-1 text-truncate text-dark bold">
                        {title}
                    </h6>
                    <small className="text-muted d-block text-truncate">
                        {subtitle}
                    </small>
                </div>
                <span
                    className="ms-2"
                    style={{ fontWeight: "light", color: "midnightblue", fontSize: "0.75rem" }}
                >
                    {info}
                </span>
            </div>

        </Link>
    );
}

export type {
    IPostAttachment
}

export default PostAttachment