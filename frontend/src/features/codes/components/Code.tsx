import { FaComment } from "react-icons/fa6";
import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa";

const colors = {
    web: "rgb(221, 72, 36)",
    c: "rgb(49, 124, 226)",
    cpp: "rgb(240, 140, 56)"
}

interface ICode {
    id?: string;
    name?: string;
    language: keyof typeof colors;
    userName?: string;
    userId?: string;
    date?: string;
    comments: number;
    votes: number;
    isUpvoted: boolean;
    isPublic: boolean;
}

interface CodeProps {
    code: ICode;
    searchQuery: string;
}

const Code = ({ code, searchQuery }: CodeProps) => {

    let titleMatch = code.name!.match(new RegExp("^" + searchQuery, "i"));
    let title = titleMatch && titleMatch.length ?
        <>
            <span className="bg-warning">{titleMatch[0]}</span>
            {code.name!.slice(titleMatch[0].length)}
        </>
        :
        <>
            {code.name}
        </>

    return (
        <div className="rounded border p-2 mb-2 bg-white d-md-flex">
            <div className="flex-grow-1 d-flex gap-2">
                <div>
                    <div className="rounded-circle d-flex justify-content-center align-items-center text-light" style={{ width: "42px", height: "42px", background: colors[code.language], textTransform: "capitalize" }}>{code.language}</div>
                </div>
                <div>
                    <Link to={"/Compiler-Playground/" + code.id}>
                        <h4>{title}</h4>
                    </Link>
                    <div className="d-flex small mt-3">
                        <div className="me-3 d-flex align-items-center">
                            <FaThumbsUp />
                            <span className="ms-2">{code.votes} Votes</span>
                        </div>
                        <div className="d-flex align-items-center">
                            <FaComment />
                            <span className="ms-2">{code.comments} Comments</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="d-flex justify-content-end align-items-end mt-3">
                <div className="d-flex">
                    <div>
                        <div>
                            <small className="text-secondary">{DateUtils.format(new Date(code.date!))}</small>
                        </div>
                        <div className="d-flex justify-content-end">
                            <ProfileName userId={code.userId!} userName={code.userName!} />
                        </div>
                    </div>
                    <div className="ms-2 wb-p-follow-item__avatar">
                        <img className="wb-p-follow-item__avatar-image" src="/resources/images/user.svg" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export type { ICode }

export default Code