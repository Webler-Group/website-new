import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import { FaCheck, FaThumbsUp } from "react-icons/fa";
import React, { MouseEvent } from 'react';
import { FaComment, FaLock } from 'react-icons/fa6';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { compilerLanguages, languagesInfo } from '../../../data/compilerLanguages';
import { useNavigate } from 'react-router-dom';
import "./Code.css";

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
    onClick?: () => void;
    selected?: boolean;
}

const Code = React.forwardRef(({ code, showUserProfile, onClick, selected }: CodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const navigate = useNavigate();

    let title = code.name;

    const handleClick = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest("a")) {
            return;
        }

        if(onClick) {
            onClick();
        } else {
            navigate("/Compiler-Playground/" + code.id);
        }
    }

    let body = (
        <div className={"wb-codes-item border-bottom p-2 d-md-flex" + (selected ? " selected" : "")} onClick={handleClick}>
            <div className="flex-grow-1 d-flex gap-2">
                <div>
                    <div className="rounded-circle d-flex justify-content-center align-items-center text-light small"
                        style={{ width: "32px", height: "32px", background: selected ? "dodgerblue" : languagesInfo[code.language].color }}>
                        {selected ? <FaCheck /> : languagesInfo[code.language].shortName}
                    </div>
                </div>
                <div>
                    <div className='text-secondary'>
                        <b style={{ wordBreak: "break-word" }}>{title}</b>
                    </div>
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
                        <div className="ms-2">
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