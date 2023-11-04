import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa";
import React from 'react';

const colors = {
    web: "rgb(221, 72, 36)",
    c: "rgb(49, 124, 226)",
    cpp: "rgb(240, 140, 56)",
    python: "rgb(56, 140, 56)",
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
    showUserProfile: boolean;
}

const Code = React.forwardRef(({ code, searchQuery, showUserProfile }: CodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
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

    let body = (
        <div className="rounded border p-2 bg-white d-md-flex">
            <div className="flex-grow-1 d-flex gap-2">
                <div>
                    <div className="rounded-circle d-flex justify-content-center align-items-center text-light" style={{ width: "42px", height: "42px", background: colors[code.language], textTransform: "capitalize" }}>{code.language}</div>
                </div>
                <div>
                    <Link to={"/Compiler-Playground/" + code.id}>
                        <h5 style={{ wordBreak: "break-word" }}>{title}</h5>
                    </Link>
                    <div className="d-flex small mt-3">
                        <div className="me-3 d-flex align-items-center">
                            <FaThumbsUp />
                            <span className="ms-2">{code.votes} Votes</span>
                        </div>
                        {
                            showUserProfile === false &&
                            <div>
                                <span className="text-secondary">{DateUtils.format2(new Date(code.date!))}</span>
                            </div>
                        }
                    </div>
                </div>
            </div>
            {
                showUserProfile &&
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
            }
        </div>
    )

    const content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content
})

export type { ICode }

export { colors }

export default Code
