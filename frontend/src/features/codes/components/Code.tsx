import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa";
import React from 'react';
import { FaLock } from 'react-icons/fa6';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { compilerLanguages, languagesInfo } from '../../../data/compilerLanguages';

interface ICode {
    id?: string;
    name?: string;
    language: compilerLanguages;
    userName?: string;
    userId?: string;
    userAvatar?: string;
    createdAt?: string;
    updatedAt?: string;
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
    const regex = new RegExp(`(^|\\b)${searchQuery.trim()}`, "i");
    const match = code.name!.match(regex);

    let title;
    if (searchQuery.trim().length > 2 && match && match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;

        title = (
            <>
                {code.name!.slice(0, start)}
                <span className="bg-warning">{code.name!.slice(start, end)}</span>
                {code.name!.slice(end)}
            </>
        );
    } else {
        title = <>{code.name!}</>;
    }

    let body = (
        <div className="rounded border p-2 bg-white d-md-flex">
            <div className="flex-grow-1 d-flex gap-2">
                <div>
                    <div className="rounded-circle d-flex justify-content-center align-items-center text-light small"
                        style={{ width: "32px", height: "32px", background: languagesInfo[code.language].color }}>{languagesInfo[code.language].shortName}</div>
                </div>
                <div>
                    <Link to={"/Compiler-Playground/" + code.id}>
                        <h5 style={{ wordBreak: "break-word" }}>{title}</h5>
                    </Link>
                    <div className="d-flex small mt-3 align-items-center gap-2">
                        <div className="d-flex align-items-center">
                            <FaThumbsUp />
                            <span className="ms-2">{code.votes} Votes</span>
                        </div>
                        {
                            showUserProfile === false &&
                            <div>
                                <span className="text-secondary">{DateUtils.format2(new Date(code.updatedAt!))}</span>
                            </div>
                        }
                        {
                            code.isPublic === false &&
                            <div>
                                <FaLock />
                            </div>
                        }
                    </div>
                </div>
            </div>
            {
                showUserProfile &&
                <div className="d-flex justify-content-end align-items-end mt-3">
                    <div className="d-flex align-items-center">
                        <div>
                            <div>
                                <small className="text-secondary">{DateUtils.format(new Date(code.updatedAt!))}</small>
                            </div>
                            <div className="d-flex justify-content-end">
                                <ProfileName userId={code.userId!} userName={code.userName!} />
                            </div>
                        </div>
                        <div className="ms-2 wb-p-follow-item__avatar">
                            <ProfileAvatar size={32} avatarImage={code.userAvatar!} />
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

export default Code