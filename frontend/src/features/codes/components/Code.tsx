import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { Link } from "react-router-dom";
import { FaThumbsUp } from "react-icons/fa";
import React from 'react';
import { FaComment, FaLock } from 'react-icons/fa6';
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

const Code = React.forwardRef(({ code, showUserProfile }: CodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    let title = code.name;

    let body = (
        <div className="border-bottom py-1 bg-white d-md-flex">
            <div className="flex-grow-1 d-flex gap-2">
                <div>
                    <div className="rounded-circle d-flex justify-content-center align-items-center text-light small"
                        style={{ width: "32px", height: "32px", background: languagesInfo[code.language].color }}>{languagesInfo[code.language].shortName}</div>
                </div>
                <div>
                    <Link to={"/Compiler-Playground/" + code.id}>
                        <b style={{ wordBreak: "break-word" }}>{title}</b>
                    </Link>
                    <div className="d-flex small mt-2 align-items-center gap-3">
                        <div className="d-flex align-items-center">
                            <FaThumbsUp />
                            <span className="ms-1">{code.votes}</span>
                        </div>
                        <div className="d-flex align-items-center">
                            <FaComment />
                            <span className="ms-1">{code.comments}</span>
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
                <div className="d-flex justify-content-end align-items-end mt-2">
                    <div className="d-flex align-items-center">
                        <div>
                            <div>
                                <small className="text-secondary">{DateUtils.format(new Date(code.createdAt!))}</small>
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