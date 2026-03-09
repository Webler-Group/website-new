import { LinkContainer } from "react-router-bootstrap";
import { PostAttachmentDetails } from "./types";

interface PostAttachmentProps {
    data: PostAttachmentDetails;
}

const PostAttachment = ({ data }: PostAttachmentProps) => {
    let title = "";
    let subtitle = "";
    let to = "#";
    let info = "";

    switch (data.type) {
        case 1: // Code
            title = data.codeName || "Untitled Code";
            subtitle = `${data.codeLanguage} • ${data.user.name}`;
            to = `/Compiler-Playground/${data.codeId}`;
            info = "code";
            break;

        case 2: // Question / Discussion
            title = data.questionTitle || "Question";
            subtitle = `${data.user.name}`;
            to = `/Discuss/${data.questionId}`;
            info = "question";
            break;

        case 4: // Feed
            title = `${data.feedMessage}`;
            subtitle = `${data.user.name}`;
            to = `/Feed/${data.feedId}`;
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

export default PostAttachment