import { Link } from "react-router-dom";
import ProfileName from "../../../components/ProfileName";
import { colors } from "../../codes/components/Code";

interface IPostAttachment {
    id: string;
    type: number;
    userId: string;
    userName: string;
    codeId: string;
    codeName: string;
    codeLanguage: keyof typeof colors;
    questionId: string;
    questionTitle: string;
}

interface PostAttachmentProps {
    data: IPostAttachment;
}

const PostAttachment = ({ data }: PostAttachmentProps) => {
    let body = (() => {
        switch (data.type) {
            case 1: return (
                <div className="d-flex gap-2">
                    <div>
                        <div className="rounded-circle d-flex justify-content-center align-items-center text-light" style={{ width: "42px", height: "42px", background: colors[data.codeLanguage], textTransform: "capitalize" }}>{data.codeLanguage}</div>
                    </div>
                    <div>
                        <Link to={"/Compiler-Playground/" + data.codeId}>
                            <h6 style={{ wordBreak: "break-word" }}>{data.codeName}</h6>
                        </Link>
                        <ProfileName userId={data.userId} userName={data.userName} />
                    </div>
                </div>
            )
            case 2: return (
                <div className="d-flex gap-2">
                    <div>
                        <div className="wb-p-follow-item__avatar">
                            <img className="wb-p-follow-item__avatar-image" src="/resources/images/user.svg" />
                        </div>
                    </div>
                    <div>
                        <Link to={"/Discuss/" + data.questionId}>
                            <h6 style={{ wordBreak: "break-word" }}>{data.questionTitle}</h6>
                        </Link>
                        <ProfileName userId={data.userId} userName={data.userName} />
                    </div>
                </div>
            )
        }
    })()

    return (
        <div className="border rounded bg-white p-1">
            {body}
        </div>
    )
}

export type {
    IPostAttachment
}

export default PostAttachment