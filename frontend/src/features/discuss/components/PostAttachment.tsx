import { Link } from "react-router-dom";
import ProfileName from "../../../components/ProfileName";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { compilerLanguages, languagesInfo } from "../../../data/compilerLanguages";

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
    let body = (() => {
        switch (data.type) {
            case 1: return (
                <div className="d-flex gap-2 align-items-center">
                    <div>
                        <div className="rounded-circle d-flex justify-content-center align-items-center text-light small" 
                        style={{ width: "32px", height: "32px", background: languagesInfo[data.codeLanguage].color, textTransform: "capitalize" }}>{languagesInfo[data.codeLanguage].shortName}</div>
                    </div>
                    <div>
                        <Link to={"/Compiler-Playground/" + data.codeId}>
                            <h6 style={{ wordBreak: "break-word", margin: "0" }}>{data.codeName}</h6>
                        </Link>
                        <ProfileName userId={data.userId} userName={data.userName} />
                    </div>
                </div>
            )
            case 2: return (
                <div className="d-flex gap-2 align-items-center">
                    <div>
                        <div className="wb-p-follow-item__avatar">
                            <ProfileAvatar size={32} avatarImage={data.userAvatar} />
                        </div>
                    </div>
                    <div>
                        <Link to={"/Discuss/" + data.questionId}>
                            <h6 style={{ wordBreak: "break-word", margin: "0" }}>{data.questionTitle}</h6>
                        </Link>
                        <ProfileName userId={data.userId} userName={data.userName} />
                    </div>
                </div>
            )
            case 4: return (
                <div className="d-flex gap-2 align-items-center">
                    <div>
                        <div className="wb-p-follow-item__avatar">
                            <ProfileAvatar size={32} avatarImage={data.userAvatar} />
                        </div>
                    </div>
                    <div>
                        <Link to={"/Feed/" + data.feedId}>
                            <h6 style={{ wordBreak: "break-word", margin: "0" }}>{data.feedMessage}</h6>
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