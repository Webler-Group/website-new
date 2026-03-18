import ProfileName from '../../../components/ProfileName';
import DateUtils from '../../../utils/DateUtils';
import ProfileAvatar from '../../../components/ProfileAvatar';
import { languagesInfo } from '../../../data/compilerLanguages';
import { Link, useNavigate } from 'react-router-dom';
import "./Code.css";
import { CodeMinimal } from '../types';
import { isUser, UserMinimal } from '../../profile/types';
import React from 'react';
import { FaThumbsUp } from 'react-icons/fa';
import { FaComment, FaLock } from 'react-icons/fa6';


interface CodeProps {
    code: CodeMinimal<UserMinimal | string>;
    searchQuery: string;
    onClick?: () => void;
    selected?: boolean;
    variant?: "default" | "compact";
}

const Code = React.forwardRef(({ code, onClick, selected, variant = "default" }: CodeProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const isCompact = variant === "compact";
    const navigate = useNavigate();

    let title = code.name;

    const handleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("a")) {
            return;
        }
        if (onClick) {
            onClick();
        } else {
            navigate("/Compiler-Playground/" + code.id);
        }
    }

    const body = (
        <div className={`wb-codes-item border-bottom bg-white d-flex align-items-start ${isCompact ? "p-2 compact" : "py-2"} ${selected ? "selected" : ""}`} onClick={handleClick}>
            {/* Left: title + language + stats */}
            <div className="flex-grow-1 min-width-0">
                <Link to={"/Compiler-Playground/" + code.id} className="d-block text-truncate text-dark" style={{ fontSize: isCompact ? "0.92rem" : "1rem" }}>
                    <b>{title}</b>
                </Link>

                <div className={`d-flex align-items-center gap-2 small text-secondary ${isCompact ? "mt-1" : "mt-2"}`}>
                    <span className="wb-language-chip" style={{ backgroundColor: languagesInfo[code.language]?.color || "#6c757d" }}>
                        {languagesInfo[code.language]?.displayName || code.language}
                    </span>
                    <div className="d-flex align-items-center gap-1 opacity-75">
                        <FaThumbsUp size={isCompact ? 10 : 11} />
                        <span>{code.votes}</span>
                    </div>
                    <div className="d-flex align-items-center gap-1 opacity-75">
                        <FaComment size={isCompact ? 10 : 11} />
                        <span>{code.comments}</span>
                    </div>
                    {code.isPublic === false && <FaLock size={11} className="text-warning" />}
                </div>
            </div>

            {/* Right: date + name + avatar */}
            {isUser(code.user) && (
                <div className="flex-shrink-0 ms-2 d-flex flex-column align-items-end justify-content-between wb-codes-user-meta">
                    <small className="text-muted wb-code-timestamp">{DateUtils.format(new Date(code.updatedAt || code.createdAt!))}</small>
                    {!isCompact && (
                        <div className="d-flex align-items-center gap-1 mt-1">
                            <ProfileName userId={code.user.id} userName={code.user.name} />
                            <ProfileAvatar size={28} avatarUrl={code.user.avatarUrl} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return ref ? <div ref={ref} className="min-width-0 overflow-hidden">{body}</div> : <div className="min-width-0 overflow-hidden">{body}</div>;
});

export default Code;
